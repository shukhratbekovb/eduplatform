import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Courses from "@/components/Courses";
import Advantages from "@/components/Advantages";
import Platform from "@/components/Platform";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import ApplicationForm from "@/components/ApplicationForm";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Courses />
        <Advantages />
        <Platform />
        <HowItWorks />
        <Testimonials />
        <FAQ />
        <ApplicationForm />
      </main>
      <Footer />
    </>
  );
}
