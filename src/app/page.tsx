'use client';
import dynamic from 'next/dynamic';
import React, {useRef, useEffect, useState} from 'react';
import type { ContextStore } from '@uiw/react-md-editor';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });
type OnChange = (value?: string, event?: React.ChangeEvent<HTMLTextAreaElement>, state?: ContextStore) => void;

enum Status {
  Success = "success",
  Error = "error",
}

enum Type {
  First = "first",
  Normal = "normal",
}

type ClientMessage = {
  status: Status;
  type: Type;
  data: string;
};

const SECOND = 1_000;

const SERVER_URL = "ws://localhost:8000/write";

const makeMessage = (data: string): ClientMessage => {
  return {
    status: Status.Success,
    type: Type.Normal,
    data,
  };
};

export default function Home() {
  const ws = useRef(null);
  const [value, setValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  var timerId;

  const fetchInitial = () => {
    if (!ws.current) return;

    const message: ClientMessage = {
      status: Status.Success,
      type: Type.First,
      data: "",
    };

    ws.current.send(JSON.stringify(message));
  };

  useEffect(() => {
    ws.current = new WebSocket(SERVER_URL);

    ws.current.onopen = function (evt) {
      setIsOpen(true);
      fetchInitial();
      console.log("OPEN");
    };

    ws.current.onclose = function (evt) {
      setIsOpen(false);
      ws.current = null;
      console.log("CLOSE");
    };

    ws.current.onmessage = function (evt) {
      const message = JSON.parse(evt.data);

      if (message["type"] == "first") {
        setValue(message["data"]);
      }
    };

    ws.current.onerror = function (evt) {
      setIsOpen(false);
      console.log("ERROR: " + evt.data);
    };

    const wsCurr = ws.current;

    return () => {
      wsCurr.close();
    };
  }, [setIsOpen]);

  const onChange = (val) => {
    if (!ws.current) return;

    clearTimeout(timerId);

    const messageData: string = val;

    if (messageData.length > 536870888) {
      window.alert("uh oh, we're writing too much!");
    }

    timerId = setTimeout(() => {
			console.log("sending: ", messageData);
      ws.current.send(JSON.stringify(makeMessage(messageData)));
			setValue(val);
    }, 2);
  };

  if (!isOpen) return <div>loading</div>;

  return (
    <main className=" w-auto mx-auto p-4">
      <MDEditor style={{ width: '100%' }} value={value} onChange={onChange} />
    </main>
  );
}
