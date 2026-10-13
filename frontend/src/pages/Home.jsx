import { Link } from "react-router-dom";

// The public landing page for the company website.
function Home() {
  return (
    <main className="home-page">
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">WELCOME TO OUR COMPANY</p>

          <h1>Practical services. Professional solutions.</h1>

          <p className="hero-description">
            We help customers find reliable services and professional support
            through a simple, transparent experience.
          </p>

          <div className="hero-actions">
            <Link className="primary-button" to="/services">
              Explore Services
            </Link>

            <Link className="secondary-button" to="/contact">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <section className="home-intro">
        <p className="eyebrow">OUR APPROACH</p>
        <h2>Service built around your needs</h2>

        <p>
          Explore our available services, learn about our company, or contact
          our team with your questions.
        </p>

        <Link className="text-link" to="/about">
          Learn more about us →
        </Link>
      </section>
    </main>
  );
}

export default Home;
