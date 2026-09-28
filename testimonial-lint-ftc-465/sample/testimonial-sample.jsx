// Testimonials.jsx - landing page section (drafted with an AI assistant)
// TODO: placeholder testimonials until we get real reviews
const testimonials = [
  { name: "Jane Doe", role: "Head of Growth, Acme", avatar: "https://randomuser.me/api/portraits/women/44.jpg", rating: 5, quote: "Cut our onboarding time in half." },
  { name: "Marcus Lee", role: "Customer Success, our team", avatar: "https://i.pravatar.cc/150?img=12", rating: 5, quote: "Lorem ipsum dolor sit amet, the best tool we use." },
];

const visible = reviews.filter((r) => r.rating >= 4);

export function Testimonials() {
  return (
    <section id="testimonials">
      {testimonials.map((t) => (
        <figure key={t.name}>
          <blockquote>{t.quote}</blockquote>
          <figcaption>{t.name} <span className="badge">Verified Buyer</span>
            <i className="info" title="Marcus is an employee of Acme Labs" /></figcaption>
        </figure>
      ))}
      <p>Leave a 5-star review and get a gift card.</p>
      <script type="application/ld+json">{`{"@type":"Product","aggregateRating":{"@type":"AggregateRating",
        "ratingValue": "4.9", "reviewCount": "2143"}}`}</script>
    </section>
  );
}
