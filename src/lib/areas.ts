// Pune areas SkyView currently serves. "Other" is kept as a selectable option
// on the booking form so a customer outside the zone gets a clear rejection
// message rather than a missing option — but it (and anything not in this
// list) is never an accepted value for a new booking.
export const PUNE_AREAS = [
  'Kothrud', 'Baner', 'Wakad', 'Hinjewadi', 'Viman Nagar', 'Koregaon Park',
  'Kharadi', 'Aundh', 'Camp', 'Hadapsar', 'Other',
];

export const SERVED_PUNE_AREAS = PUNE_AREAS.filter(area => area !== 'Other');
