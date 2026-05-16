/** fal.ai image-to-image — keep prompts compact to preserve room geometry and reduce furniture blobs. */
export const DEFAULT_STAGING_STYLE = 'coastal_modern';

export const STAGING_PROMPTS: Record<string, string> = {
  coastal_modern:
    'MLS interior photograph, coastal modern virtual staging: light neutral palette, subtle blue accents, simple low-profile seating, natural light, clean lines, realistic shadows, no warped walls or doors, Charleston coastal mood',
  lowcountry_traditional:
    'MLS interior photograph, traditional Lowcountry virtual staging: warm neutrals, linen and natural wood tones, simple Southern-style seating, soft daylight, realistic scale, no distorted windows',
  contemporary:
    'MLS interior photograph, contemporary virtual staging: bold but minimal furniture, geometric shapes, polished neutrals, gallery-like lighting, realistic perspective',
  minimalist:
    'MLS interior photograph, minimalist virtual staging: white walls, light wood, very sparse furniture, lots of negative space, bright even light, architectural clarity',
  luxury_resort:
    'MLS interior photograph, luxury resort virtual staging: greige palette, refined upholstery, subtle metallic accents, layered lighting, editorial real-estate quality, believable proportions',
  empty_clean:
    'MLS interior photograph, empty virtually-staged room: no furniture, freshly painted white walls, clean floors, bright even light, show ceiling height and windows accurately',
};

/** Lower strength preserves walls, windows, and perspective; higher causes smeared “furniture blobs.” */
export const FAL_IMAGE_TO_IMAGE_STRENGTH = 0.4;
