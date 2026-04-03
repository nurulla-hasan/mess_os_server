"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
let server;
async function bootstrap() {
    try {
        await mongoose_1.default.connect(config_1.config.db.uri);
        console.log(`Database stably linked gracefully connecting internally`);
        server = app_1.default.listen(config_1.config.port, () => {
            console.log(`Server actively running bound fully onto port ${config_1.config.port}`);
        });
    }
    catch (error) {
        console.error(`Server abruptly crashed natively triggering termination`);
        process.exit(1);
    }
}
bootstrap();
process.on('unhandledRejection', (error) => {
    if (server) {
        server.close(() => process.exit(1));
    }
    else {
        process.exit(1);
    }
});
process.on('uncaughtException', (error) => {
    process.exit(1);
});
