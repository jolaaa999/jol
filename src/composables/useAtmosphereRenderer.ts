import { onMounted, onUnmounted, type Ref } from 'vue'
import * as THREE from 'three'

const SKY_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const SKY_FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) * 2.0 - 1.0;
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 6; i++) {
      value += amplitude * noise(p * frequency);
      frequency *= 2.03;
      amplitude *= 0.48;
    }
    return value;
  }

  vec3 rayleighSky(float elevation) {
    vec3 zenith = vec3(0.04, 0.18, 0.52);
    vec3 mid = vec3(0.28, 0.52, 0.78);
    vec3 horizon = vec3(0.82, 0.88, 0.90);
    vec3 dawn = vec3(0.94, 0.86, 0.72);

    float zenithMix = pow(clamp(elevation, 0.0, 1.0), 0.38);
    vec3 sky = mix(horizon, mix(mid, zenith, zenithMix), zenithMix);

    float horizonGlow = pow(1.0 - elevation, 4.5);
    sky = mix(sky, dawn, horizonGlow * 0.32);

    return sky;
  }

  float cloudLayer(vec2 uv, float altitude, float speed, float density) {
    vec2 wind = vec2(uTime * speed, uTime * speed * 0.08);
    vec2 p = uv * vec2(2.8, 1.6) + wind + vec2(altitude * 0.4, 0.0);
    float base = fbm(p);
    float detail = fbm(p * 2.4 + vec2(17.3, 9.1)) * 0.45;
    float shape = smoothstep(0.05, 0.72, base + detail);
    float fade = smoothstep(0.15, 0.55, uv.y) * smoothstep(0.95, 0.65, uv.y);
    return shape * fade * density;
  }

  void main() {
    float elevation = vUv.y;
    vec3 sky = rayleighSky(elevation);

    float sunDot = dot(normalize(vec2(-0.72, 0.68)), normalize(vec2(vUv.x - 0.18, vUv.y - 0.82)));
    sky += vec3(1.0, 0.92, 0.78) * pow(max(sunDot, 0.0), 24.0) * 0.35;

    float c1 = cloudLayer(vUv, 0.0, 0.012, 0.55);
    float c2 = cloudLayer(vUv + vec2(0.37, 0.08), 1.3, 0.008, 0.42);
    float c3 = cloudLayer(vUv + vec2(-0.22, 0.14), 2.1, 0.006, 0.38);
    float clouds = clamp(c1 + c2 * 0.85 + c3 * 0.7, 0.0, 1.0);

    vec3 cloudColor = vec3(1.0, 0.99, 0.97);
    vec3 color = mix(sky, cloudColor, clouds * 0.72);

    float vignette = smoothstep(1.2, 0.3, length(vUv - vec2(0.5)));
    color *= mix(0.92, 1.0, vignette);

    gl_FragColor = vec4(color, 1.0);
  }
`

export function useAtmosphereRenderer(canvasRef: Ref<HTMLCanvasElement | null>) {
  let renderer: THREE.WebGLRenderer | null = null
  let material: THREE.ShaderMaterial | null = null
  let rafId = 0
  let startTime = performance.now()

  function resize(): void {
    const canvas = canvasRef.value
    if (!canvas || !renderer || !material) return

    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    canvas.width = w * dpr
    canvas.height = h * dpr
    renderer.setSize(w, h, false)
    material.uniforms.uResolution.value.set(w, h)
  }

  function init(): void {
    const canvas = canvasRef.value
    if (!canvas) return

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    material = new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
      },
      depthWrite: false,
      depthTest: false,
    })

    const geometry = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    resize()

    const tick = (): void => {
      if (!renderer || !material) return
      material.uniforms.uTime.value = (performance.now() - startTime) * 0.001
      renderer.render(scene, camera)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  function onResize(): void {
    resize()
  }

  onMounted(() => {
    init()
    window.addEventListener('resize', onResize)
  })

  onUnmounted(() => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', onResize)
    material?.dispose()
    renderer?.dispose()
    renderer = null
    material = null
  })
}
