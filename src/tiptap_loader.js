import {Editor} from "@tiptap/core";
import {StarterKit} from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import {HocuspocusProvider} from "@hocuspocus/provider";
import axios from "axios";

const API_URI = "http://api.localhost:5555";

let editor;

const params = new URLSearchParams(window.location.search);

const token = new URLSearchParams(window.location.search).get("token");
if (!token) {
  const redirectURL = encodeURIComponent(`${window.location.origin}`);

  window.location = `http://web-auth.localhost:3005/?email=&back_to=%2F&callback_url=${redirectURL}`;

  throw new Error("Missing token! Redirecting...");
}

let documentId = parseInt(params.get("document"), 10);

if (!documentId) {
  documentId = prompt("Please enter an agreement id");

  params.set("document", documentId);

  window.location.search = params.toString();
}

function userColor(id) {
  const h = id % 360;

  return "hsl(" + h + ", 50%, 60%)";
}

function publish() {
  const html = editor.getHTML();

  const enc = new TextEncoder();

  const buf = String.fromCharCode(...enc.encode(html));

  console.log("Publishing document...", buf);

  return axios.patch(
    `${API_URI}/agreements/${documentId}`,
    {template: buf},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

async function fetchUser() {
  return await axios
    .post(`${API_URI}/user/me`, null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => {
      return response.data;
    });
}

fetchUser().then((user) => {
  user.color = userColor(user.id);

  const ydoc = new Y.Doc();

  const provider = new HocuspocusProvider({
    url: "ws://127.0.0.1:3003",
    name: documentId,
    document: ydoc,
    token: token,
  });

  provider.setAwarenessField("user", user);

  editor = new Editor({
    element: document.querySelector(".element"),
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider,
        user,
      }),
    ],
  });
});

document.addEventListener(
  "DOMContentLoaded",
  () => {
    document.getElementById("btn-publish").addEventListener("click", publish);
  },
  false
);
