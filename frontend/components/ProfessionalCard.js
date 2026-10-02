import Link from 'next/link';

export default function ProfessionalCard({ professional }) {
  const initials = (professional.business_name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <Link className="professional-card" href={`/professionals/${professional.id}`}>
      {professional.booking_paused && <span className="badge paused">Paused</span>}
      {!professional.booking_paused && professional.is_featured && <span className="badge">Featured</span>}
      <div className="avatar">
        {professional.profile_photo_url ? <img src={professional.profile_photo_url} alt="" /> : initials}
      </div>
      <div className="pname">{professional.business_name}</div>
      <div className="ptitle">{professional.professional_title || professional.subcategory?.name || professional.category?.name}</div>
      <div className="tags">
        {professional.category && <span className="tag">{professional.category.name}</span>}
        {professional.city && <span className="tag">{professional.city}</span>}
      </div>
      <div className="meta-row">
        <span className="rating"><span className="star">★</span> {professional.average_rating || 'New'} {professional.reviews_count ? `(${professional.reviews_count})` : ''}</span>
        <span className="fee">₹{professional.consultation_fee}</span>
      </div>
    </Link>
  );
}
