// Shared serialization helpers so profile shape stays consistent across public search,
// profile detail, and dashboard endpoints.

function parseSocialLinks(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (err) { return {}; }
}

function publicProfileCard(profile) {
  return {
    id: profile.id,
    business_name: profile.business_name,
    professional_title: profile.professional_title,
    profile_photo_url: profile.profile_photo_url,
    category: profile.Category ? { id: profile.Category.id, name: profile.Category.name, slug: profile.Category.slug } : null,
    subcategory: profile.Subcategory ? { id: profile.Subcategory.id, name: profile.Subcategory.name, slug: profile.Subcategory.slug } : null,
    city: profile.city,
    consultation_fee: profile.consultation_fee,
    languages_spoken: profile.languages_spoken ? profile.languages_spoken.split(',').map(s => s.trim()).filter(Boolean) : [],
    average_rating: profile.average_rating,
    reviews_count: profile.reviews_count,
    years_of_experience: profile.years_of_experience,
    is_featured: profile.is_featured,
    booking_paused: profile.booking_paused,
    // Present but null until geocoding is wired up; frontend can already render map-view UI.
    latitude: profile.latitude,
    longitude: profile.longitude,
    created_at: profile.created_at
  };
}

function publicProfileDetail(profile) {
  return {
    ...publicProfileCard(profile),
    qualifications: profile.qualifications,
    years_of_experience: profile.years_of_experience,
    about: profile.about,
    contact_number: profile.contact_number,
    contact_email: profile.contact_email,
    address_line: profile.address_line,
    state: profile.state,
    postal_code: profile.postal_code,
    country: profile.country,
    google_maps_url: profile.google_maps_url,
    website_url: profile.website_url,
    social_links: parseSocialLinks(profile.social_links),
    slot_duration_minutes: profile.slot_duration_minutes,
    completed_appointments_count: profile.completed_appointments_count
  };
}

function ownerProfileDetail(profile) {
  return {
    ...publicProfileDetail(profile),
    user_id: profile.user_id,
    category_id: profile.category_id,
    subcategory_id: profile.subcategory_id,
    status: profile.status,
    updated_at: profile.updated_at
  };
}

module.exports = { publicProfileCard, publicProfileDetail, ownerProfileDetail, parseSocialLinks };
