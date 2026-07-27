import path from "path";
import Queue from "queue";
import nodemon from "nodemon";
import { injectable, inject } from "inversify";

import { IOCContainer } from "@/frameworks/mpx-build-tool/cores/IOCContainer";
import { FrameworkConfigManager } from "@/frameworks/mpx-build-tool/commons/FrameworkConfigManager";
import { ServerSiderConfigManager } from "@/frameworks/mpx-build-tool/configs/webpack/ServerSiderConfigManager";
import { ServerProjectVirtualFile } from "@/frameworks/mpx-build-tool/services/ServerProjectVirtualFile";
import { GenerateSwaggerDocsService } from "@/frameworks/mpx-build-tool/services/GenerateSwaggerDocsService";

import type { Compiler } from "webpack";

/**
 * @description 运行开发命令,可以基于cluster同时开启服务端和客户端渲染服务
 * **/
@injectable()
export class MakeServerApplication {

  private webpackQueue = new Queue({ concurrency: 1, autostart: true });

  constructor (
    @inject(FrameworkConfigManager) private readonly $FrameworkConfigManager: FrameworkConfigManager,
    @inject(ServerSiderConfigManager) private readonly $ServerSiderConfigManager: ServerSiderConfigManager,
    @inject(ServerProjectVirtualFile) private readonly $ServerProjectVirtualFile: ServerProjectVirtualFile,
    @inject(GenerateSwaggerDocsService) private readonly $GenerateSwaggerDocsService: GenerateSwaggerDocsService
  ) { };

  /**
   * 启动应用服务的开发模式
   * **/
  public async bootstrapByDevelopmentMode() {
    const { assetsDirectoryPath } = this.$FrameworkConfigManager.getRuntimeConfig();
    await this.$ServerProjectVirtualFile.initialize();
    const webpackDevelopmentCompiler: Compiler = await this.$ServerSiderConfigManager.getWebpackDevelopmentCompiler();
    await new Promise((resolve, reject) => {
      webpackDevelopmentCompiler.run((error, stats) => {
        if (error) {
          reject(error);
        } else {
          if (stats.hasErrors()) {
            console.log(stats.toString({ colors: true }));
          };
          resolve(true);
        };
      });
    });
    await this.$GenerateSwaggerDocsService.execute();
    nodemon({
      verbose: true,
      watch: [path.resolve(assetsDirectoryPath, "./server.js")],
      script: path.resolve(assetsDirectoryPath, "./server.js")
    });
    webpackDevelopmentCompiler.watch({}, async (error, stats) => {
      if (error) {
        console.log(error);
      } else {
        if (stats.hasErrors()) {
          console.log(stats.toString({ colors: true }));
        };
        return this.webpackQueue.push(async () => {
          await this.$GenerateSwaggerDocsService.execute();
        });
      };
    });
  };

  /**
   * 进行应用服务的编译
   * **/
  public async startBuild() {
    const webpackProductionCompiler: Compiler = await this.$ServerSiderConfigManager.getWebpackProductionCompiler();
    await this.$ServerProjectVirtualFile.initialize();
    await new Promise((resolve, reject) => {
      webpackProductionCompiler.run((error, stats) => {
        if (error) {
          reject(error);
        } else {
          console.log(stats.toString({ colors: true }));
          resolve(true);
        };
      });
    });
    await this.$GenerateSwaggerDocsService.execute();
  };

};

IOCContainer.bind(MakeServerApplication).toSelf().inSingletonScope();


// if (this.childProcess) {
//   this.childProcess.kill("SIGKILL");
// };

// this.childProcess = await spawn("node", [path.resolve(assetsDirectoryPath, "./server.js")], {
//   stdio: "inherit",
//   stderr: "inherit"
// });

// if (this.childProcess) {
//   await new Promise((resolve) => {
//     const handleClose = () => {
//       resolve(true);
//       this.childProcess.removeAllListeners("close");
//     };
//     this.childProcess.on("close", handleClose);
//     this.childProcess.kill("SIGKILL");
//   });
//   this.childProcess = undefined;
//   await new Promise((resolve) => setTimeout(resolve, 100));
// };