import { InfisicalSDK } from "@infisical/sdk"

export default class Infisical {
  #client: InfisicalSDK
  #id: string
  #secret: string
  #env: string
  #projectId: string

  static async fromKey(key: string) {
    const chunks = key.split(":")

    if (chunks.length !== 4) {
      throw new Error(
        "Invalid vault key. Should be in the form id:secret:projectId:env",
      )
    }

    const [id, secret, projectId, env] = chunks
    return await Infisical.create(id, secret, projectId, env)
  }

  static async create(
    id: string,
    secret: string,
    projectId: string,
    env: string,
  ) {
    const client = new InfisicalSDK({
      siteUrl: "https://vault.divvun.user.town",
    })
    const infisical = new Infisical(id, secret, projectId, env, client)
    await infisical.#auth()
    return infisical
  }

  private constructor(
    id: string,
    secret: string,
    projectId: string,
    env: string,
    client: InfisicalSDK,
  ) {
    this.#id = id
    this.#secret = secret
    this.#env = env
    this.#projectId = projectId
    this.#client = client
  }

  async #auth() {
    await this.#client.auth().universalAuth.login({
      clientId: this.#id,
      clientSecret: this.#secret,
    })
  }

  async secrets(): Promise<Record<string, string>> {
    try {
      const secrets: Record<string, string>[] = await this.#client
        .secrets()
        .listSecrets({
          environment: this.#env,
          projectId: this.#projectId,
          recursive: true,
        })
        .then((x) => x.secrets as unknown as Record<string, string>[])

      return secrets.reduce((acc, secret) => {
        if (secret.secretPath === "/") {
          acc[secret.secretKey] = secret.secretValue
        } else {
          acc[secret.secretPath.slice(1) + "/" + secret.secretKey] =
            secret.secretValue
        }
        return acc
      }, {} as Record<string, string>)
    } catch (e) {
      const error = e as Record<string, unknown>

      if (typeof error.message === "string") {
        if (error.message.includes("StatusCode=404")) {
          return {}
        }
      }

      throw e
    }
  }

  async secret(key: string): Promise<string | null> {
    try {
      return await this.#client
        .secrets()
        .getSecret({
          secretName: key,
          environment: this.#env,
          projectId: this.#projectId,
        })
        .then((r) => r.secretValue)
    } catch (e: unknown) {
      const error = e as Record<string, unknown>

      if (typeof error.message === "string") {
        if (error.message.includes("StatusCode=404")) {
          return null
        }
      }

      throw e
    }
  }
}
