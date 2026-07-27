import os from "os";
import path from "path";
import { injectable, inject } from "inversify";

import { IOCContainer } from "@/frameworks/react-ssr-tool-box/compilation/cores/IOCContainer";
import { CompilationConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/commons/CompilationConfigManager";

@injectable()
export class ScriptLoaderConfigManger {

  constructor (
    @inject(CompilationConfigManager) private readonly $CompilationConfigManager: CompilationConfigManager
  ) { };

  /**
   * 对于node_modules中的模块而言需要使用esbuild-loader进行加载因为可能涉及到一些esm等浏览器不兼容的模块
   * **/
  private async getNodeModulesRules() {
    return [{
      loader: "esbuild-loader"
    }, {
      loader: "thread-loader",
      options: {
        poolRespawn: false,
        workers: os.cpus().length > 2 ? os.cpus().length - 1 : os.cpus().length
      }
    }];
  };

  /**
   * 对于其余的项目文件则需要使用ts-loader和babel-loader
   * **/
  private async getProjectRules() {
    const { projectDirectoryPath } = this.$CompilationConfigManager.getRuntimeConfig();
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
        use: await this.getNodeModulesRules()
      }, {
        use: await this.getProjectRules()
      }]
    }];
  };

};

IOCContainer.bind(ScriptLoaderConfigManger).toSelf().inSingletonScope();