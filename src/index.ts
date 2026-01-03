import Server from "./server";
import config from "@config/dotenv.config";

const server = new Server();

server.start(config.port);
