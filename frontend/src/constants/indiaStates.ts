/**
 * Complete list of 28 States & 8 Union Territories of India
 */
export const INDIA_STATES: string[] = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

/**
 * Fast zero-latency PIN code prefix mapping for instant state auto-detection.
 */
export function getFastStateFromPincode(pincode: string): string | null {
  const cleanPin = pincode.trim().replace(/\D/g, '');
  if (cleanPin.length < 2) return null;

  const prefix2 = parseInt(cleanPin.slice(0, 2), 10);
  const prefix3 = parseInt(cleanPin.slice(0, 3), 10);

  if (prefix2 === 11) return 'Delhi';
  if (prefix2 === 12 || prefix2 === 13) return 'Haryana';
  if (prefix2 === 14 || prefix2 === 15) return 'Punjab';
  if (prefix2 === 16) return 'Chandigarh';
  if (prefix2 === 17) return 'Himachal Pradesh';
  if (prefix2 === 18 || prefix2 === 19) return 'Jammu and Kashmir';

  if (prefix2 >= 20 && prefix2 <= 28) {
    if (prefix2 === 24 || prefix2 === 26) return 'Uttarakhand';
    return 'Uttar Pradesh';
  }

  if (prefix2 >= 30 && prefix2 <= 34) return 'Rajasthan';

  if (prefix2 >= 36 && prefix2 <= 39) {
    if (prefix3 === 396) return 'Dadra and Nagar Haveli and Daman and Diu';
    return 'Gujarat';
  }

  if (prefix2 >= 40 && prefix2 <= 44) {
    if (prefix3 === 403) return 'Goa';
    return 'Maharashtra';
  }

  if (prefix2 >= 45 && prefix2 <= 48) return 'Madhya Pradesh';
  if (prefix2 === 49) return 'Chhattisgarh';

  if (prefix2 >= 50 && prefix2 <= 53) {
    if (prefix2 === 50) return 'Telangana';
    return 'Andhra Pradesh';
  }

  if (prefix2 >= 56 && prefix2 <= 59) return 'Karnataka';

  if (prefix2 >= 60 && prefix2 <= 64) {
    if (prefix3 === 605) return 'Puducherry';
    return 'Tamil Nadu';
  }

  if (prefix2 >= 67 && prefix2 <= 69) {
    if (prefix3 === 682) return 'Lakshadweep';
    return 'Kerala';
  }

  if (prefix2 >= 70 && prefix2 <= 74) {
    if (prefix3 === 744) return 'Andaman and Nicobar Islands';
    return 'West Bengal';
  }

  if (prefix2 >= 75 && prefix2 <= 77) return 'Odisha';
  if (prefix2 === 78) return 'Assam';

  if (prefix2 === 79) {
    if (prefix3 === 790 || prefix3 === 791 || prefix3 === 792) return 'Arunachal Pradesh';
    if (prefix3 === 793 || prefix3 === 794) return 'Meghalaya';
    if (prefix3 === 795) return 'Manipur';
    if (prefix3 === 796) return 'Mizoram';
    if (prefix3 === 797) return 'Nagaland';
    if (prefix3 === 798) return 'Tripura';
    if (prefix3 === 799) return 'Sikkim';
    return 'Assam';
  }

  if (prefix2 >= 80 && prefix2 <= 85) {
    if (prefix2 === 81 || prefix2 === 82 || prefix2 === 83 || prefix2 === 84 && parseInt(cleanPin.slice(2, 4), 10) > 50) {
      return 'Jharkhand';
    }
    return 'Bihar';
  }

  return null;
}

/**
 * Async lookup for exact Indian Postal PIN code API (returns exact State & District).
 */
export async function lookupPincodeDetails(pincode: string): Promise<{ state?: string; district?: string } | null> {
  const cleanPin = pincode.trim().replace(/\D/g, '');
  if (cleanPin.length !== 6) {
    const fast = getFastStateFromPincode(cleanPin);
    return fast ? { state: fast } : null;
  }

  const fastState = getFastStateFromPincode(cleanPin);

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        return {
          state: po.State || fastState || undefined,
          district: po.District || undefined,
        };
      }
    }
  } catch (err) {
    console.warn('Pincode live API lookup failed, falling back to prefix detection:', err);
  }

  return fastState ? { state: fastState } : null;
}
