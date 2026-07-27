import WebpackBar from "webpackbar";
import { merge } from "webpack-merge";
import { injectable, inject } from "inversify";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { webpack, DefinePlugin, SourceMapDevToolPlugin } from "webpack";

import { IOCContainer } from "@/frameworks/react-ssr-tool-box/compilation/cores/IOCContainer";
import { CompilationConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/commons/CompilationConfigManager";

import { CompilationMaterielResourceDatabaseManager } from "@/frameworks/react-ssr-tool-box/compilation/commons/CompilationMaterielResourceDatabaseManager";
import { ScriptLoaderConfigManger } from "@/frameworks/react-ssr-tool-box/compilation/configs/loaders/ScriptLoaderConfigManger";
import { FileLoaderConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/configs/loaders/FileLoaderConfigManager";
import { LessLoaderConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/configs/loaders/LessLoaderConfigManager";
import { SassLoaderConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/configs/loaders/SassLoaderConfigManager";
import { CssLoaderConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/configs/loaders/CssLoaderConfigManager";

import { ConvertDehydrateEntryFile } from "@/frameworks/react-ssr-tool-box/compilation/services/ConvertDehydrateEntryFile";
import { ComputedExternalsModules } from "@/frameworks/react-ssr-tool-box/compilation/services/ComputedExternalsModules";
import { CompilerProgressPlugin } from "@/frameworks/react-ssr-tool-box/compilation/plugins/CompilerProgressPlugin";

import type { PathData, Compiler, Configuration } from "webpack";

/**
 * 脱水化资源的编译选项管理器
 * **/
@injectable()
export class DehydrateConfigManager {

  constructor (
    @inject(CompilationMaterielResourceDatabaseManager) private readonly $CompilationMaterielResourceDatabaseManager: CompilationMaterielResourceDatabaseManager,
    @inject(ConvertDehydrateEntryFile) private readonly $ConvertDehydrateEntryFile: ConvertDehydrateEntryFile,
    @inject(ScriptLoaderConfigManger) private readonly $ScriptLoaderConfigManger: ScriptLoaderConfigManger,
    @inject(FileLoaderConfigManager) private readonly $FileLoaderConfigManager: FileLoaderConfigManager,
    @inject(LessLoaderConfigManager) private readonly $LessLoaderConfigManager: LessLoaderConfigManager,
    @inject(SassLoaderConfigManager) private readonly $SassLoaderConfigManager: SassLoaderConfigManager,
    @inject(CssLoaderConfigManager) private readonly $CssLoaderConfigManager: CssLoaderConfigManager,
    @inject(ComputedExternalsModules) private readonly $ComputedExternalsModules: ComputedExternalsModules,
    @inject(CompilationConfigManager) private readonly $CompilationConfigManager: CompilationConfigManager
  ) { };

  /**
   * 最基础的webpack编译配置
   * **/
  public async getBasicConfig(): Promise<Configuration> {
    const { projectDirectoryPath } = this.$CompilationConfigManager.getRuntimeConfig();
    return {
      entry: this.$ConvertDehydrateEntryFile.getWebpackEntryPoints(),
      target: "node",
      resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        alias: {
          "@": projectDirectoryPath
        }
      },
      // node: {
      //   global: true,
      //   __dirname: true,
      //   __filename: true
      // },
      externalsPresets: { node: true },
      //externals: [nodeExternals({
      // allowlist: ["antd", "bootstrap", "bootstrap-react"]
      // modulesFromFile: path.resolve(projectDirectoryPath, "./package.json")
      //})],
      externals: await this.$ComputedExternalsModules.getComputedExternalsPackageList(),
      module: {
        rules: (await Promise.all([
          this.$FileLoaderConfigManager.getConfigByDehydrate(),
          this.$ScriptLoaderConfigManger.getLoaderConfig(),
          this.$LessLoaderConfigManager.getLoaderConfig(),
          this.$SassLoaderConfigManager.getLoaderConfig(),
          this.$CssLoaderConfigManager.getLoaderConfig()
        ])).flat()
      },
      plugins: [
        new WebpackBar({ name: "制作脱水物料" }),
        new CompilerProgressPlugin({
          type: "dehydrate",
          materielResourceDatabaseManager: this.$CompilationMaterielResourceDatabaseManager
        }),
        new DefinePlugin({
          "process.env.RESOURCE_TYPE": JSON.stringify("dehydrate")
        })
      ]
    };
  };

  /**
   * 开发模式下的webpack配置
   * **/
  public async getWebpackDevelopmentCompiler(): Promise<Compiler> {
    const { dehydrateResourceDirectoryPath, extractResourceDirectoryName } = this.$CompilationConfigManager.getRuntimeConfig();
    const basicConfig: Configuration = await this.getBasicConfig();
    const webpackCompiler = webpack(merge<Configuration>(basicConfig, {
      mode: "development",
      devtool: "source-map",
      output: {
        clean: true,
        path: dehydrateResourceDirectoryPath,
        devtoolModuleFilenameTemplate: "[absolute-resource-path]",
        filename: (pathData: PathData) => `index-${pathData.chunk.name}-dehydrate.js`,
        library: {
          type: "commonjs"
        }
      },
      plugins: [
        new MiniCssExtractPlugin({
          runtime: false,
          linkType: false,
          filename: (pathData: PathData) => `../${extractResourceDirectoryName}/index-${pathData.chunk.name}-dehydrate.css`
        })
      ]
    }));
    await this.$ConvertDehydrateEntryFile.mountWithWebpackCompiler(webpackCompiler);
    return webpackCompiler;
  };

  /**
   * 生产模式下的webpack配置
   * **/
  public async getWebpackProductionCompiler(): Promise<Compiler> {
    const { dehydrateResourceDirectoryPath, extractResourceDirectoryName } = this.$CompilationConfigManager.getRuntimeConfig();
    const basicConfig: Configuration = await this.getBasicConfig();
    const webpackCompiler = webpack(merge<Configuration>(basicConfig, {
      mode: "none",
      devtool: false,
      output: {
        clean: true,
        path: dehydrateResourceDirectoryPath,
        devtoolModuleFilenameTemplate: "[absolute-resource-path]",
        filename: (pathData: PathData) => `index-${pathData.chunk.name}-dehydrate-[contenthash].js`,
        library: {
          type: "commonjs"
        }
      },
      plugins: [
        new MiniCssExtractPlugin({
          runtime: false,
          linkType: false,
          filename: (pathData: PathData) => `../${extractResourceDirectoryName}/index-${pathData.chunk.name}-dehydrate-[contenthash].css`
        }),
        new SourceMapDevToolPlugin({
          test: /\.(js|css|less|scss|sass)($|\?)/i,
          filename: `../prod-source-maps/[base].map`, // 这里的 [file] 是指原文件名（如 main.js 或 main.css）
          // append: "\n//# sourceMappingURL=http://your-server.com/maps/[url]"
          // append为false的时候等价于hidden-source-map
          append: false
        })
      ]
    }));
    await this.$ConvertDehydrateEntryFile.mountWithWebpackCompiler(webpackCompiler);
    return webpackCompiler;
  };

};

IOCContainer.bind(DehydrateConfigManager).toSelf().inRequestScope();