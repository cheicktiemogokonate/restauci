import net from "node:net";

const host = process.env.CLAMAV_HOST ?? "127.0.0.1";
const port = Number(process.env.CLAMAV_PORT ?? "3310");

function scan(body) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const chunks = [];
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Timeout ClamAV"));
    }, 15_000);
    socket.on("connect", () => {
      socket.write(Buffer.from("zINSTREAM\0"));
      const length = Buffer.alloc(4);
      length.writeUInt32BE(body.length);
      socket.write(length);
      socket.write(body);
      socket.write(Buffer.alloc(4));
    });
    socket.on("data", (chunk) => chunks.push(chunk));
    socket.on("end", () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks).toString("utf8").replace(/[\0\r\n]+$/g, ""));
    });
    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

const cleanResponse = await scan(Buffer.from("Toutci ClamAV health probe."));
if (!cleanResponse.endsWith(" OK")) {
  throw new Error(`ClamAV a refusé le témoin propre: ${cleanResponse.slice(0, 200)}`);
}

// Signature de test EICAR assemblée en mémoire uniquement afin que le dépôt et
// les postes développeur ne contiennent jamais un fichier de test détectable.
const eicar = [
  "X5O!P%@AP[4",
  "\\",
  "PZX54(P^)7CC)7}",
  "$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!",
  "$H+H*",
].join("");
const infectedResponse = await scan(Buffer.from(eicar));
if (!infectedResponse.endsWith(" FOUND")) {
  throw new Error("ClamAV n'a pas détecté le témoin EICAR.");
}

console.log("ClamAV vérifié : fichier propre accepté et témoin EICAR rejeté.");
