import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { join } from "path";

// Use process.cwd() to construct path - works in both dev and production
const PROTO_PATH = join(process.cwd(), "src/grpc/proto/media.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

interface MediaProtoDefinition {
  media: {
    MediaService: grpc.ServiceClientConstructor;
  };
}

export const mediaProto = grpc.loadPackageDefinition(
  packageDefinition
) as unknown as MediaProtoDefinition;
export const MediaService = mediaProto.media.MediaService;

export { grpc, protoLoader };
