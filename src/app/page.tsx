import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Manifesto } from "@/components/Manifesto";
import { Operations } from "@/components/Operations";
import { Works } from "@/components/Works";
import { DemoIndex } from "@/components/DemoIndex";
import { Process } from "@/components/Process";
import { About } from "@/components/About";
import { FAQ } from "@/components/FAQ";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { SmoothScroll } from "@/components/SmoothScroll";
import { SkipLink } from "@/components/SkipLink";
import { Cursor } from "@/components/Cursor";
import { Grain } from "@/components/Grain";
import { ScrollProgress } from "@/components/ScrollProgress";

export default function Home() {
  return (
    <>
      <SkipLink />
      <SmoothScroll />
      <Cursor />
      <ScrollProgress />
      <Nav />
      <main id="main">
        <Hero />
        <Manifesto />
        <Operations />
        <Works />
        <DemoIndex />
        <Process />
        <About />
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <Grain />
    </>
  );
}
