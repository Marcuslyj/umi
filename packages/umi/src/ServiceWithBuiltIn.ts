import { IServiceOpts, Service as CoreService } from '@umijs/core';
import { dirname } from 'path';

// 继承了 CoreService，对其进行了加强
class Service extends CoreService {
  constructor(opts: IServiceOpts) {
    // 增加 UMI_VERSION
    // umi 包 package.json 文件中定义的 version
    process.env.UMI_VERSION = require('../package').version;
    // 增加 UMI_DIR 
    // umi 这个包所在的路径
    // require.resolve 函数查询某个模块文件的带有完整绝对路径的文件名
    process.env.UMI_DIR = dirname(require.resolve('../package'));

    super({
      ...opts,
      presets: [
        // 后续看下 @umijs/preset-built-in 
        require.resolve('@umijs/preset-built-in'),
        ...(opts.presets || []),
      ],
      // 这里定义了一个插件， umiAlias，该插件修改 webpack 配置中的 alias。具体插件怎么生效的，还需要看看 CoreService。
      plugins: [require.resolve('./plugins/umiAlias'), ...(opts.plugins || [])],
    });
  }
}

export { Service };
