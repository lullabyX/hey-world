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
        attribute float cutoutFlag;
        uniform vec2 atlasScale;
        uniform vec2 atlasPadding;
        varying vec2 vUvAtlas;
        varying vec3 vTint;
        varying float vCutoutFlag;
      ` +
      shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        // Compute per-face quad UVs from geometry, independent of the built-in box UV unwrap
        vec2 baseUv;
        if (normal.y > 0.5) {
          // top: project XZ
          baseUv = position.xz + 0.5;
        } else if (normal.y < -0.5) {
          // bottom: project XZ (flip V for consistency)
          baseUv = position.xz + 0.5;
          baseUv.y = 1.0 - baseUv.y;
        } else if (abs(normal.x) > 0.5) {
          // ±X sides: project ZY, flip U for +X to match outward facing orientation
          baseUv = vec2(normal.x > 0.0 ? -position.z : position.z, position.y) + 0.5;
        } else {
          // ±Z sides: project XY, flip U for -Z to match outward facing orientation
          baseUv = vec2(normal.z > 0.0 ? position.x : -position.x, position.y) + 0.5;
        }
        vec2 _uvOffset = (normal.y > 0.5) ? uvTop : ((normal.y < -0.5) ? uvBottom : uvSide);
        vec2 tileScale = atlasScale;
        if (tileScale.x > 0.99) {
          // Fallback in case atlasScale uniform hasn't been initialized yet
          tileScale = vec2(1.0/16.0, 1.0/16.0);
        }
        vUvAtlas = (baseUv * (tileScale - 2.0 * atlasPadding)) + (_uvOffset + atlasPadding);
        vTint = (normal.y > 0.5) ? tintTop : ((normal.y < -0.5) ? tintBottom : tintSide);
        vCutoutFlag = cutoutFlag;
        `
      );
    // Ensure the map UV passed to the fragment uses our atlas coordinates
    shader.vertexShader = shader.vertexShader.replace(
      '#include <map_vertex>',
      `#ifdef USE_MAP
        vMapUv = vUvAtlas;
      #endif`
    );
    shader.fragmentShader =
      `
        varying vec2 vUvAtlas;
        varying vec3 vTint;
        varying float vCutoutFlag;
      ` +
      shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vUvAtlas );
          #ifdef DECODE_VIDEO_TEXTURE
            sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
          #endif
          // Cutout for leaves: drop low-alpha or near-black texels
          if ( vCutoutFlag > 0.5 ) {
            if ( sampledDiffuseColor.a < 0.5 ) discard;
            if ( all(lessThan(sampledDiffuseColor.rgb, vec3(0.05))) ) discard;
          }
          diffuseColor *= sampledDiffuseColor;
        #endif
        diffuseColor.rgb *= vTint;`
      );
  };
}
