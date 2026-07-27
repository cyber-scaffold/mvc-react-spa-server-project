import os from "os";
import path from "path";
import { injectable, inject } from "inversify";

import { IOCContainer } from "@/frameworks/mpx-build-tool/cores/IOCContainer";
import { FrameworkConfigManager } from "@/frameworks/mpx-build-tool/commons/FrameworkConfigManager";

@injectable()
export class ScriptLoaderConfigManger {

  constructor (
    @inject(FrameworkConfigManager) private readonly $FrameworkConfigManager: FrameworkConfigManager
  ) { };

  /**
   * 对于node_modules中的模块而言需要使用esbuild-loader进行加载因为可能涉及到一些esm等浏览器不兼容的模块
   * **/
  private async getNodeModulesRules() {
    return [{
      loader: "esbuild-loader",
      options: {}
    }, {
      loader: "thread-loader",
      options: {
        poolRespawn: false,
        workers: os.cpus().length > 2 ? os.cpus().length - 1 : os.cpus().length
      }
    }];
  };

  /**
   * 对于自研框架的项目文件则需要使用ts-loader
   * **/
  private async getFrameworksRules() {
    const { projectDirectoryPath } = this.$FrameworkConfigManager.getRuntimeConfig();
    return [{
      loader: "ts-loader",
      options: {
        configFile: path.resolve(projectDirectoryPath, "./tsconfig.json")
      }
    }];
  };


  /**
   * 对于其余的项目文件则需要使用ts-loader和babel-loader
   * **/
  private async getProjectRules() {
    const { projectDirectoryPath } = this.$FrameworkConfigManager.getRuntimeConfig();
    return [{
      loader: "babel-loader",
      options: {
        configFile: path.join(projectDirectoryPath, "./.babelrc.js")
      }
    }, {
      loader: "ts-loader",
      options: {
        configFile: path.resolve(projectDirectoryPath, "./tsconfig.json")
      }
    }];
  };

  public async getLoaderConfig() {
    return [{
      test: /\.(js|jsx|ts|tsx|mjs|cjs)$/,
      oneOf: [{
        include: /(node_modules)/,
        type: "javascript/esm",
        use: await this.getNodeModulesRules()
      }, {
        include: /(frameworks)/,
        use: await this.getFrameworksRules()
      }, {
        use: await this.getProjectRules()
      }]
    }];
  };

};

IOCContainer.bind(ScriptLoaderConfigManger).toSelf().inSingletonScope();