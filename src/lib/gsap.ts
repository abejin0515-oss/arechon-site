// @/lib/gsap — single registration point for GSAP + plugins.
// Import { gsap, ScrollTrigger } from "@/lib/gsap" everywhere; never register twice.
//
// Bundle cost: gsap core ~23KB gz + ScrollTrigger ~11KB gz = ~34KB gz total
// (already a project dependency — this file adds ~0KB, it only centralizes registration).
//
// SSR note: gsap.registerPlugin is safe to call during module eval on the server
// (ScrollTrigger guards its own window access until .create/.refresh runs in the browser).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
