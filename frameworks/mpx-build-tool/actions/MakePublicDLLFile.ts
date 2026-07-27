import webpack from "webpack";
import { injectable, inject } from "inversify";

import { IOCContainer } from "@/frameworks/mpx-build-tool/cores/IOCContainer";
import { DLLConfigManager } from "@/frameworks/mpx-build-tool/configs/webpack/DLLConfigManager";

/**
 * @description 运行开发命令,可以基于cluster同时开启服务端和客户端渲染服务
 * **/
@injectable()
export class MakePublicDLLFile {

  constructor (
    @inject(DLLConfigManager) private readonly $DLLConfigManager: DLLConfigManager
  ) { };

  /**
   * 进行应用服务的编译
   * **/
  public async startBuild() {
    const serverSiderRenderConfig: any = await this.$DLLConfigManager.getProductionConfig();
    const serverSiderCompiler = webpack(serverSiderRenderConfig);
    await new Promise((resolve, reject) => {
      serverSiderCompiler.run((error, stats) => {
        if (error) {
          reject(error);
        } else {
          if (stats.hasWarnings) {
            console.log(stats.toString({ colors: true }));
          };
          if (stats.hasErrors()) {
            console.log(stats.toString({ colors: true }));
          };
          resolve(true);
        };
      });
    });
  };

  public async execute() {
    await this.startBuild();
  };

};

IOCContainer.bind(MakePublicDLLFile).toSelf().inSingletonScope();