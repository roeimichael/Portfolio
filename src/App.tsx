import Nav from "./components/Nav";
import Hero from "./components/Hero";
import About from "./components/About";
import Projects from "./components/Projects";
import InDevelopment from "./components/InDevelopment";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <Nav />
      <main>
        <Hero />
        <About />
        <Projects />
        <InDevelopment />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
