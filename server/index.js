import {Server} from "@hocuspocus/server";
import {Logger} from "@hocuspocus/extension-logger";
import * as Y from "yjs";
import axios from "axios";

const API_URI = process.env.API_URI || "https://api.uat-crusaders.stageverivest.com";

console.log("Server started!");

const server = Server.configure({
  port: process.env.PORT || 3003,
  extensions: [new Logger()],

  async onConfigure(data) {
    // Output some information
    console.log(`Server was configured!`);
  },

  // async onConnect(data) {
  //   // Output some information
  //   console.log(`New websocket connection`);
  // },

  async onAuthenticate(data) {
    const {token} = data;

    return axios
      .post(`${API_URI}/auth/check-token`, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then(() => {
        return {
          token,
        };
      });
  },

  async onLoadDocument(data) {
    const {context, document, documentName} = data;

    console.log("Load document", documentName, context.token);

    return axios
      .get(`${API_URI}/agreements/${documentName}`, {
        headers: {
          Authorization: `Bearer ${context.token}`,
        },
      })
      .then((response) => {
        if (!!response.data.y_doc) {
          console.log("response.data.y_doc", response.data.y_doc)
          const update = Buffer.from(response.data.y_doc, "base64");

          Y.applyUpdate(document, update);
        }

        return document;
      });
  },

  async onStoreDocument(data) {
    const {context, document, documentName} = data;

    const buf = Y.encodeStateAsUpdate(document);

    const base64Buf = Buffer.from(buf).toString("base64");

    return axios.patch(
      `${API_URI}/agreements/${documentName}`,
      {y_doc: base64Buf},
      {
        headers: {
          Authorization: `Bearer ${context.token}`,
        },
      }
    );
  },
});

server.enableDebugging();

server.listen();
