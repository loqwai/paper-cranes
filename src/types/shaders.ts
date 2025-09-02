export interface ShaderSource {
  readonly content: string
  readonly url: string
}

export interface ShaderCompileResult {
  readonly success: boolean
  readonly shader: WebGLShader | null
  readonly error: string | null
  readonly lineNumber: number | null
}

export interface ShaderProgramResult {
  readonly success: boolean
  readonly program: WebGLProgram | null
  readonly error: string | null
}

export interface ShaderMetadata {
  readonly name: string
  readonly fileUrl: string
  readonly visualizerUrl: string
}

export interface KnobUniforms {
  readonly [key: `knob_${number}`]: number
}

export interface AudioUniforms {
  readonly [key: string]: number | boolean
}

export type ShaderTransformer = (shader: string) => string