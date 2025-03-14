import dns from "dns";
import fs from "fs";
import { urls } from "./constants.js";

const retry = async (fn, n) => {
  for (let i = 0; i < n; i++) {
    try {
      return await fn();
    } catch {}
  }
  return {
    failed: true,
  };
};

const getHostConfig = async (url) => {
  const getConfig = async () => {
    const response = await dns.promises.lookup(url);
    return { url, ip: response.address };
  };
  try {
    const config = await retry(getConfig, 3);
    if (config.failed) {
      return { url, ip: "" };
    }
    return config;
  } catch {}
};

const resolveUrls = async () => {
  const promises = urls.map(getHostConfig);
  return Promise.all(promises);
};

const generateHosts = (configs) => {
  let hostStr = "# Add to switchhosts \n";
  hostStr += "# https://gh-proxy.com/raw.githubusercontent.com/dev-easily/gh-hosts/refs/heads/main/hosts\n";
  hostStr += "# Github Hosts start \n\n";
  configs.forEach((i) => {
    const whiteLen = 16 - i.ip.length;
    if (!i.ip) {
      hostStr += `# ${i.url} update failed\n`;
    } else {
      hostStr += `${i.ip} ${" ".repeat(whiteLen)} ${i.url}\n`;
    }
  });
  const updateTime = new Date().toLocaleString("en-US", {
    timeZone: "Asia/shanghai",
  });
  hostStr += `\n# Last update: ${updateTime}\n`;
  hostStr += "# Github Hosts end";
  return {
    hostStr,
    updateTime,
  };
};

const writeHosts = (hosts) => {
  const { hostStr, updateTime } = generateHosts(hosts);
  const template = fs.readFileSync("./README.template.md", "utf-8");
  const nextReadme = template.toString().replace("{{hosts}}", hostStr).replace("{{last_update_time}}", updateTime);
  fs.writeFileSync("./hosts", hostStr);
  fs.writeFileSync("./README.md", nextReadme);
  fs.writeFileSync("./README-ZH_CN.md", nextReadme);
};

const main = async () => {
  const configs = await resolveUrls();
  writeHosts(configs);
};

main();
