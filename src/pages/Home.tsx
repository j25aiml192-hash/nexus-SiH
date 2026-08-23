import Navbar from '@/components/home/Navbar';
import HeroSection from '@/components/home/HeroSection';
import StatsSection from '@/components/home/StatsSection';
import FeaturesSection from '@/components/home/FeaturesSection';
import ProcessSection from '@/components/home/ProcessSection';
import CtaFooterSection from '@/components/home/CtaFooterSection';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased selection:bg-black selection:text-white">
      {/* Editorial Navigation */}
      <Navbar />

      {/* Main Content */}
      <main>
        {/* Hero Section: Centered black typography on pure white */}
        <HeroSection />

        {/* Operational Metrics & Scale */}
        <StatsSection />

        {/* Core Forensic Capabilities */}
        <FeaturesSection />

        {/* 4-Stage Operational Workflow */}
        <ProcessSection />
      </main>

      {/* Closing Call-to-Action & System Telemetry Footer */}
      <CtaFooterSection />
    </div>
  );
}
