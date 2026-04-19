import { Link } from 'react-router-dom';

export default function AboutPage() {
    return (
        <div className="about-page">
            <div className="page-header fade-in-up">
                <h1>About ShoeStore</h1>
                <p>Our story, our passion</p>
            </div>

            <div className="about-grid">
                <section className="about-card fade-in-up">
                    <span className="about-icon">👟</span>
                    <h2>Our Story</h2>
                    <p>
                        ShoeStore was born from a simple idea: everyone deserves access to quality
                        footwear that fits their style and budget. What started as a small family-run
                        shop has grown into a curated online destination for sneakers and shoes.
                    </p>
                    <p>
                        We handpick every pair in our collection, working directly with trusted brands
                        and manufacturers to ensure authenticity and quality. Whether you're looking for
                        everyday comfort or head-turning style, we've got you covered.
                    </p>
                </section>

                <section className="about-card fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <span className="about-icon">🎯</span>
                    <h2>Our Mission</h2>
                    <p>
                        We believe that the right pair of shoes can change your day. Our mission is to
                        make shoe shopping effortless — with a carefully curated selection, transparent
                        pricing, and a shopping experience that puts you first.
                    </p>
                </section>
            </div>

            <div className="about-values fade-in-up" style={{ animationDelay: '0.15s' }}>
                <h2>What Sets Us Apart</h2>
                <div className="values-grid">
                    <div className="value-item">
                        <span className="value-icon">✅</span>
                        <h4>100% Authentic</h4>
                        <p>Every product is verified for authenticity before it reaches you.</p>
                    </div>
                    <div className="value-item">
                        <span className="value-icon">🚚</span>
                        <h4>Fast Delivery</h4>
                        <p>We ship nationwide with tracking on every order.</p>
                    </div>
                    <div className="value-item">
                        <span className="value-icon">🔄</span>
                        <h4>Easy Returns</h4>
                        <p>Not the right fit? Return within 14 days, no hassle.</p>
                    </div>
                    <div className="value-item">
                        <span className="value-icon">💬</span>
                        <h4>Customer First</h4>
                        <p>Our team is always ready to help with any questions or concerns.</p>
                    </div>
                </div>
            </div>

            <div className="about-cta fade-in-up" style={{ animationDelay: '0.2s' }}>
                <h2>Ready to find your next pair?</h2>
                <Link to="/shop" className="store-button">Browse our collection</Link>
            </div>
        </div>
    );
}
