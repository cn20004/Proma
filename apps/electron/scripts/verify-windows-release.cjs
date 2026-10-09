/** 发布前校验 Windows 在线更新所需的三个工件，避免发布半成品。 */
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { createHash } = require('node:crypto')
const { load } = require('js-yaml')

function verifyWindowsRelease(version, directory, assets) {
  const installerName = `Proma-20004-Setup-${version}.exe`
  const names = [installerName, `${installerName}.blockmap`, 'latest.yml']
  for (const name of names) {
    const local = readFileSync(join(directory, name))
    const asset = assets.find((item) => item.name === name)
    if (!asset || asset.state !== 'uploaded' || asset.size !== local.length || local.length === 0) {
      throw new Error(`更新工件未完整上传：${name}`)
    }
    const digest = `sha256:${createHash('sha256').update(local).digest('hex')}`
    if (asset.digest !== digest) throw new Error(`更新工件校验和不一致：${name}`)
  }
  const manifest = load(readFileSync(join(directory, 'latest.yml'), 'utf8'))
  const installer = readFileSync(join(directory, installerName))
  const sha512 = createHash('sha512').update(installer).digest('base64')
  const entry = manifest?.files?.find((file) => file.url === installerName)
  if (manifest?.version !== version || manifest.path !== installerName || manifest.sha512 !== sha512 || entry?.sha512 !== sha512 || entry.size !== installer.length) {
    throw new Error('latest.yml 的版本号、文件名、大小或校验和与安装包不一致')
  }
  return installerName
}

module.exports = { verifyWindowsRelease }
