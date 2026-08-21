declare module 'ali-oss' {
  export default class OSS {
    constructor(opts: Record<string, unknown>)
    put(
      name: string,
      file: string,
      opts?: { headers?: Record<string, string> }
    ): Promise<{
      name: string
      url?: string
      res?: { headers?: Record<string, string> }
    }>
  }
}
