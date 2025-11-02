"use client";
import dynamic from "next/dynamic";
import React, { useRef, useEffect, useState } from "react";
import type { ContextStore } from "@uiw/react-md-editor";
import diff_match_patch from "diff-match-patch";
import Editor from "./editor";

type OnChange = (
  value?: string,
  event?: React.ChangeEvent<HTMLTextAreaElement>,
  state?: ContextStore
) => void;

type Patch = [-1 | 0 | 1, string];

interface Message {
  patches: Patch[];
}

interface MyResponse {
  status: "OK" | "ERROR";
  doc?: string;
}

const SERVER_URL = "ws://localhost:8000/write";

const FIRST_MESSAGE: Message = {
  patches: [],
};

export default function Home() {
  const diffMatchPatch = new diff_match_patch();
  const ws = useRef<WebSocket | null>(null);
  const [value, setValue] = useState("");
  const [syncedValue, setSyncedValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  useEffect(() => {
    ws.current = new WebSocket(SERVER_URL);

    ws.current.onopen = function (evt) {
      setIsOpen(true);
      if (ws.current) {
        // it would be nice to enforce the api by altering the send method type
        ws.current.send(JSON.stringify(FIRST_MESSAGE));
      }
      console.log("OPEN");
    };

    ws.current.onclose = function (evt) {
      setIsOpen(false);
      ws.current = null;
      console.log("CLOSE");
    };

    ws.current.onmessage = function (evt) {
      const message: MyResponse = JSON.parse(evt.data);

      console.log("RECEIVED: " + JSON.stringify(message));
      if (message.status === "OK" && message.doc) {
        console.log("OK from server, doc: ", message.doc);
        setValue(message.doc);
      }

      if (message.status === "ERROR") {
        console.log("ERROR from server");
        // stop showing editor
      }
    };

    ws.current.onerror = function (evt: Event) {
      setIsOpen(false);
      console.log("ERROR: " + (evt as ErrorEvent).message);
    };

    const wsCurr = ws.current;

    return () => {
      wsCurr.close();
    };
  }, [setIsOpen]);

  const onChange: OnChange = (val) => {
    if (!ws.current) return;

    clearTimeout(timeoutRef.current);

    const messageData: string = val || "";

    if (messageData.length > 536870888) {
      window.alert("uh oh, we're writing too much!");
    }

    timeoutRef.current = setTimeout(() => {
      setSyncedValue(messageData);
      if (ws.current) {
        const patches = diffMatchPatch.diff_main(syncedValue, messageData);
        const message: Message = { patches };
        console.log("sending: ", message);
        ws.current.send(JSON.stringify(message));
      }
    }, 50);

    setValue(messageData);
  };

  if (!isOpen) return <div>loading</div>;

  return (
    <main className=" w-auto mx-auto p-4">
      <Editor value={value} onChange={onChange} />
    </main>
  );
}
