import { stdin as input, stdout as output } from "node:process";

export async function promptHidden(label: string): Promise<string> {
  output.write(`${label}: `);

  if (!input.isTTY || typeof input.setRawMode !== "function") {
    const line = await new Promise<string>((resolve) => {
      input.once("data", (chunk) => {
        resolve(String(chunk).replace(/\r?\n$/, ""));
      });
    });
    output.write("\n");
    return line.trim();
  }

  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");

  return new Promise((resolve) => {
    let value = "";

    const onData = (chunk: string) => {
      for (const char of chunk) {
        switch (char) {
          case "\n":
          case "\r":
          case "\u0004":
            input.setRawMode(false);
            input.pause();
            input.removeListener("data", onData);
            output.write("\n");
            resolve(value);
            return;
          case "\u0003":
            process.exit(130);
            return;
          case "\u007f":
          case "\b":
            if (value.length > 0) {
              value = value.slice(0, -1);
              output.write("\b \b");
            }
            break;
          default:
            value += char;
            output.write("*");
            break;
        }
      }
    };

    input.on("data", onData);
  });
}
