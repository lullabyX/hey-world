import { WebGLProgramParametersWithUniforms } from 'three';

export function createAtlasOnBeforeCompile(uniformRefs: {
  atlasScaleRef: { current: { x: number; y: number } };
  atlasPaddingRef: { current: { x: number; y: number } };
}) {
  const { atlasScaleRef, atlasPaddingRef } = uniformRefs;
  return (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.atlasScale = { value: atlasScaleRef.current };
    shader.uniforms.atlasPadding = { value: atlasPaddingRef.current };
    shader.vertexShader =
      `
        attribute vec2 uvTop;
        attribute vec2 uvSide;
        attribute vec2 uvBottom;
        attribute vec3 tintTop, tintSide, tintBottom;
        uniform vec2 atlasScale;
        uniform vec2 atlasPadding;
        varying vec2 vUvAtlas;
        varying vec3 vTint;
      ` +
      shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        vec2 _uvOffset = (normal.y > 0.5) ? uvTop : ((normal.y < -0.5) ? uvBottom : uvSide);
        vUvAtlas = (uv * (atlasScale - 2.0 * atlasPadding)) + (_uvOffset + atlasPadding);
        vTint = (normal.y > 0.5) ? tintTop : ((normal.y < -0.5) ? tintBottom : tintSide);
        `
      );
    shader.fragmentShader =
      `
        varying vec2 vUvAtlas;
        varying vec3 vTint;
      ` +
      shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vUvAtlas );
          diffuseColor *= sampledDiffuseColor;
        #endif
        diffuseColor.rgb *= vTint;
        `
      );
  };
}
