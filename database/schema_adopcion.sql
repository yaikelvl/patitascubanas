-- ==============================================================================
-- PATITAS CUBANAS — ESQUEMA COMPLETO DE BASE DE DATOS & SEGURIDAD SUPABASE
-- Plataforma de Adopción de Animales en Cuba
-- ==============================================================================
-- Este script es 100% idempotente (se puede ejecutar múltiples veces sin error).
-- Ejecuta este script completo en el SQL Editor de tu panel de Supabase.
-- ==============================================================================

-- 1. BAÚL PRIVADO DE AUTENTICACIÓN (ADMIN AUTH VAULT)
-- Totalmente aislado del rol público 'anon'. Nadie sin autorización puede leer el hash.
CREATE TABLE IF NOT EXISTS public.admin_auth_vault (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  salt TEXT NOT NULL DEFAULT 'c0f3e8b41a924b1d',
  hash TEXT NOT NULL DEFAULT '9633bc3cfbcf5b5f16fafd8ebaa2bb5a09a0b9c7ec18e2e2beb0c221eabed948', -- PIN inicial por defecto: 1234
  iterations INT NOT NULL DEFAULT 25000,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar registro inicial
INSERT INTO public.admin_auth_vault (id, salt, hash, iterations)
VALUES ('primary', 'c0f3e8b41a924b1d', '9633bc3cfbcf5b5f16fafd8ebaa2bb5a09a0b9c7ec18e2e2beb0c221eabed948', 25000)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS estricto (sin políticas para anon: totalmente inaccesible desde el cliente directo)
ALTER TABLE public.admin_auth_vault ENABLE ROW LEVEL SECURITY;


-- 2. BUCKET DE ALMACENAMIENTO DE FOTOS ('media')
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  8388608, -- 8 MB máx
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/avif'];

-- Política de lectura pública del bucket
DROP POLICY IF EXISTS "media_lectura_publica" ON storage.objects;
CREATE POLICY "media_lectura_publica"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');


-- 3. BIBLIOTECA DE MEDIOS (media_assets)
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL DEFAULT 'media',
  folder TEXT NOT NULL DEFAULT 'pets',
  base_path TEXT NOT NULL,
  variants JSONB NOT NULL DEFAULT '{}'::jsonb,
  paths JSONB NOT NULL DEFAULT '{}'::jsonb,
  alt TEXT,
  width INT,
  height INT,
  bytes INT,
  mime TEXT,
  blur_data_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_folder ON public.media_assets (folder, created_at DESC);
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_assets_lectura_publica" ON public.media_assets;
CREATE POLICY "media_assets_lectura_publica"
  ON public.media_assets FOR SELECT USING (true);


-- 4. CONFIGURACIÓN DEL SITIO (site_settings)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'Patitas Cubanas',
  subtitle TEXT DEFAULT 'Red Nacional de Adopción y Protección Animal en Cuba',
  slogan TEXT DEFAULT 'Cada vida cuenta: adopta, no compres y cambia un destino',
  accent_phrase TEXT DEFAULT 'Conectando corazones en toda la isla, municipio a municipio.',
  description TEXT,
  phone_primary TEXT DEFAULT '+53 5200 0000',
  phone_secondary TEXT,
  whatsapp TEXT DEFAULT '5352000000',
  email TEXT DEFAULT 'contacto@patitascubanas.org',
  address TEXT DEFAULT 'La Habana & Villa Clara, Cuba',
  marquee JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  stats JSONB DEFAULT '{"rescuedCount": "340+", "adoptionsCompleted": "280+", "provincesActive": "16", "volunteerHomes": "45"}'::jsonb,
  socials JSONB DEFAULT '{"telegram": "", "facebook": "", "instagram": ""}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_lectura_publica" ON public.site_settings;
CREATE POLICY "site_settings_lectura_publica"
  ON public.site_settings FOR SELECT USING (true);


-- 5. DONATIVOS Y TARJETAS EN CUBA (donation_settings)
CREATE TABLE IF NOT EXISTS public.donation_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  title TEXT DEFAULT 'Apoya a Nuestros Rescataditos',
  description TEXT,
  card_holder_cup TEXT DEFAULT 'Protección Animal Solidaria Cuba',
  card_number_cup TEXT DEFAULT '9224 0000 1234 5678',
  bank_cup TEXT DEFAULT 'Banco Metropolitano / BANDEC',
  payment_methods_cup TEXT DEFAULT 'Transfermóvil & EnZona',
  card_holder_mlc TEXT DEFAULT 'Protección Animal Solidaria',
  card_number_mlc TEXT DEFAULT '9225 0000 8765 4321',
  bank_mlc TEXT DEFAULT 'BPA / BANDEC',
  crypto_address TEXT DEFAULT 'TF7Nu8QzZ82J67XUvK91a45M89o456xXYZ',
  crypto_network TEXT DEFAULT 'USDT (Red TRC-20)',
  phone_confirmation TEXT DEFAULT '+53 5200 0000',
  confirmation_note TEXT DEFAULT 'Por favor, envía comprobante por WhatsApp o SMS para transparencia.',
  needed_supplies JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.donation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "donation_settings_lectura_publica" ON public.donation_settings;
CREATE POLICY "donation_settings_lectura_publica"
  ON public.donation_settings FOR SELECT USING (true);


-- 6. MASCOTAS EN ADOPCIÓN (pets)
CREATE TABLE IF NOT EXISTS public.pets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL DEFAULT 'Perro',
  breed TEXT DEFAULT 'Mestizo criollo',
  gender TEXT NOT NULL DEFAULT 'Macho',
  age_category TEXT DEFAULT 'Joven',
  approx_age TEXT,
  size TEXT DEFAULT 'Mediano',
  province TEXT NOT NULL,
  municipality TEXT NOT NULL,
  address_reference TEXT,
  status TEXT NOT NULL DEFAULT 'disponible',
  is_vaccinated BOOLEAN DEFAULT false,
  is_dewormed BOOLEAN DEFAULT false,
  is_sterilized BOOLEAN DEFAULT false,
  special_needs TEXT,
  story TEXT,
  contact_name TEXT,
  contact_whatsapp TEXT,
  contact_phone TEXT,
  image TEXT,
  asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  is_featured BOOLEAN DEFAULT false,
  badge TEXT,
  sort_order INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pets_location ON public.pets (province, municipality);
CREATE INDEX IF NOT EXISTS idx_pets_status ON public.pets (status, is_featured);
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pets_lectura_publica" ON public.pets;
CREATE POLICY "pets_lectura_publica"
  ON public.pets FOR SELECT USING (true);


-- 7. PROCEDIMIENTOS ALMACENADOS SEGUROS (RPC) CON VERIFICACIÓN DE PIN

-- 7.1. Obtener parámetros públicos de derivación
CREATE OR REPLACE FUNCTION get_admin_auth_params()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salt TEXT;
  v_iter INT;
BEGIN
  SELECT salt, iterations INTO v_salt, v_iter FROM admin_auth_vault WHERE id = 'primary';
  RETURN jsonb_build_object(
    'salt', COALESCE(v_salt, 'c0f3e8b41a924b1d'),
    'iterations', COALESCE(v_iter, 25000)
  );
END;
$$;

-- 7.2. Verificar PIN
CREATE OR REPLACE FUNCTION verify_admin_pin(p_pin_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_hash TEXT;
BEGIN
  SELECT hash INTO v_stored_hash FROM admin_auth_vault WHERE id = 'primary';
  IF v_stored_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Baúl de seguridad no inicializado');
  END IF;

  IF lower(trim(v_stored_hash)) = lower(trim(p_pin_hash)) THEN
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'PIN incorrecto');
  END IF;
END;
$$;

-- 7.3. Actualizar PIN
CREATE OR REPLACE FUNCTION verify_and_update_pin(
  p_current_pin_hash TEXT,
  p_new_salt TEXT,
  p_new_hash TEXT,
  p_iterations INT DEFAULT 25000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_hash TEXT;
BEGIN
  SELECT hash INTO v_stored_hash FROM admin_auth_vault WHERE id = 'primary';
  IF v_stored_hash IS NULL OR lower(trim(v_stored_hash)) != lower(trim(p_current_pin_hash)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'PIN actual incorrecto');
  END IF;

  UPDATE admin_auth_vault
  SET
    salt = p_new_salt,
    hash = p_new_hash,
    iterations = p_iterations,
    updated_at = NOW()
  WHERE id = 'primary';

  RETURN jsonb_build_object('success', true, 'message', 'PIN actualizado correctamente');
END;
$$;

-- 7.4. Guardar datos completos (Mascotas, Configuración y Donaciones)
CREATE OR REPLACE FUNCTION verify_and_save_all(
  p_pin_hash TEXT,
  p_site JSONB DEFAULT NULL,
  p_donations JSONB DEFAULT NULL,
  p_pets JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verify JSONB;
  pet_rec RECORD;
  incoming_ids TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Validar PIN
  v_verify := verify_admin_pin(p_pin_hash);
  IF (v_verify->>'success')::BOOLEAN IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autorizado: PIN incorrecto');
  END IF;

  -- 1. Actualizar configuración del sitio
  IF p_site IS NOT NULL THEN
    INSERT INTO site_settings (
      id, name, subtitle, slogan, accent_phrase, description,
      phone_primary, phone_secondary, whatsapp, email, address,
      marquee, faqs, stats, socials, updated_at
    )
    VALUES (
      'default',
      COALESCE(p_site->>'name', 'Patitas Cubanas'),
      p_site->>'subtitle',
      p_site->>'slogan',
      p_site->>'accentPhrase',
      p_site->>'description',
      p_site->>'phonePrimary',
      p_site->>'phoneSecondary',
      p_site->>'whatsapp',
      p_site->>'email',
      p_site->>'address',
      COALESCE(p_site->'marquee', '[]'::jsonb),
      COALESCE(p_site->'faqs', '[]'::jsonb),
      COALESCE(p_site->'stats', '{}'::jsonb),
      COALESCE(p_site->'socials', '{}'::jsonb),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      subtitle = EXCLUDED.subtitle,
      slogan = EXCLUDED.slogan,
      accent_phrase = EXCLUDED.accent_phrase,
      description = EXCLUDED.description,
      phone_primary = EXCLUDED.phone_primary,
      phone_secondary = EXCLUDED.phone_secondary,
      whatsapp = EXCLUDED.whatsapp,
      email = EXCLUDED.email,
      address = EXCLUDED.address,
      marquee = EXCLUDED.marquee,
      faqs = EXCLUDED.faqs,
      stats = EXCLUDED.stats,
      socials = EXCLUDED.socials,
      updated_at = NOW();
  END IF;

  -- 2. Actualizar configuración de donativos
  IF p_donations IS NOT NULL THEN
    INSERT INTO donation_settings (
      id, title, description,
      card_holder_cup, card_number_cup, bank_cup, payment_methods_cup,
      card_holder_mlc, card_number_mlc, bank_mlc,
      crypto_address, crypto_network,
      phone_confirmation, confirmation_note, needed_supplies, is_active, updated_at
    )
    VALUES (
      'default',
      p_donations->>'title',
      p_donations->>'description',
      p_donations->>'cardHolderCup',
      p_donations->>'cardNumberCup',
      p_donations->>'bankCup',
      p_donations->>'paymentMethodsCup',
      p_donations->>'cardHolderMlc',
      p_donations->>'cardNumberMlc',
      p_donations->>'bankMlc',
      p_donations->>'cryptoAddress',
      p_donations->>'cryptoNetwork',
      p_donations->>'phoneConfirmation',
      p_donations->>'confirmationNote',
      COALESCE(p_donations->'neededSupplies', '[]'::jsonb),
      COALESCE((p_donations->>'isActive')::BOOLEAN, true),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      card_holder_cup = EXCLUDED.card_holder_cup,
      card_number_cup = EXCLUDED.card_number_cup,
      bank_cup = EXCLUDED.bank_cup,
      payment_methods_cup = EXCLUDED.payment_methods_cup,
      card_holder_mlc = EXCLUDED.card_holder_mlc,
      card_number_mlc = EXCLUDED.card_number_mlc,
      bank_mlc = EXCLUDED.bank_mlc,
      crypto_address = EXCLUDED.crypto_address,
      crypto_network = EXCLUDED.crypto_network,
      phone_confirmation = EXCLUDED.phone_confirmation,
      confirmation_note = EXCLUDED.confirmation_note,
      needed_supplies = EXCLUDED.needed_supplies,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();
  END IF;

  -- 3. Sincronizar mascotas
  IF p_pets IS NOT NULL AND jsonb_array_length(p_pets) > 0 THEN
    FOR pet_rec IN SELECT * FROM jsonb_to_recordset(p_pets) AS x(
      id TEXT, name TEXT, species TEXT, breed TEXT, gender TEXT,
      age_category TEXT, approx_age TEXT, size TEXT, province TEXT,
      municipality TEXT, address_reference TEXT, status TEXT,
      is_vaccinated BOOLEAN, is_dewormed BOOLEAN, is_sterilized BOOLEAN,
      special_needs TEXT, story TEXT, contact_name TEXT,
      contact_whatsapp TEXT, contact_phone TEXT, image TEXT,
      asset_id UUID, is_featured BOOLEAN, badge TEXT, sort_order INT
    )
    LOOP
      incoming_ids := array_append(incoming_ids, pet_rec.id);
      INSERT INTO pets (
        id, name, species, breed, gender, age_category, approx_age, size,
        province, municipality, address_reference, status,
        is_vaccinated, is_dewormed, is_sterilized, special_needs, story,
        contact_name, contact_whatsapp, contact_phone, image, asset_id,
        is_featured, badge, sort_order, updated_at
      )
      VALUES (
        pet_rec.id, pet_rec.name, COALESCE(pet_rec.species, 'Perro'), pet_rec.breed,
        COALESCE(pet_rec.gender, 'Macho'), pet_rec.age_category, pet_rec.approx_age,
        COALESCE(pet_rec.size, 'Mediano'), pet_rec.province, pet_rec.municipality,
        pet_rec.address_reference, COALESCE(pet_rec.status, 'disponible'),
        COALESCE(pet_rec.is_vaccinated, false), COALESCE(pet_rec.is_dewormed, false),
        COALESCE(pet_rec.is_sterilized, false), pet_rec.special_needs, pet_rec.story,
        pet_rec.contact_name, pet_rec.contact_whatsapp, pet_rec.contact_phone,
        pet_rec.image, pet_rec.asset_id, COALESCE(pet_rec.is_featured, false),
        pet_rec.badge, COALESCE(pet_rec.sort_order, 1), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        species = EXCLUDED.species,
        breed = EXCLUDED.breed,
        gender = EXCLUDED.gender,
        age_category = EXCLUDED.age_category,
        approx_age = EXCLUDED.approx_age,
        size = EXCLUDED.size,
        province = EXCLUDED.province,
        municipality = EXCLUDED.municipality,
        address_reference = EXCLUDED.address_reference,
        status = EXCLUDED.status,
        is_vaccinated = EXCLUDED.is_vaccinated,
        is_dewormed = EXCLUDED.is_dewormed,
        is_sterilized = EXCLUDED.is_sterilized,
        special_needs = EXCLUDED.special_needs,
        story = EXCLUDED.story,
        contact_name = EXCLUDED.contact_name,
        contact_whatsapp = EXCLUDED.contact_whatsapp,
        contact_phone = EXCLUDED.contact_phone,
        image = EXCLUDED.image,
        asset_id = EXCLUDED.asset_id,
        is_featured = EXCLUDED.is_featured,
        badge = EXCLUDED.badge,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW();
    END LOOP;

    -- Borrar animales eliminados del listado
    DELETE FROM pets WHERE id NOT IN (SELECT unnest(incoming_ids));
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Datos sincronizados exitosamente con Supabase');
END;
$$;

-- 7.5. Eliminar mascota individual por ID
CREATE OR REPLACE FUNCTION verify_and_delete_pet(
  p_pin_hash TEXT,
  p_pet_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verify JSONB;
BEGIN
  v_verify := verify_admin_pin(p_pin_hash);
  IF (v_verify->>'success')::BOOLEAN IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
  END IF;

  DELETE FROM pets WHERE id = p_pet_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


-- 8. DATOS INICIALES SEMILLA (SEED DATA)
-- Se insertan datos de ejemplo de rescates en Cuba para que la base de datos empiece con contenido real.

INSERT INTO public.site_settings (
  id, name, subtitle, slogan, accent_phrase, description,
  phone_primary, whatsapp, email, address, marquee, faqs, stats
)
VALUES (
  'default',
  'Patitas Cubanas',
  'Red Nacional de Adopción y Protección Animal en Cuba',
  'Cada vida cuenta: adopta, no compres y cambia un destino',
  'Conectando corazones en toda la isla, municipio a municipio.',
  'Plataforma solidaria sin fines de lucro dedicada a conectar a protectores, refugios independientes y familias amorosas en todas las provincias de Cuba.',
  '+53 5200 0000',
  '5352000000',
  'contacto@patitascubanas.org',
  'La Habana & Villa Clara, Cuba',
  '[
    "🐾 Campaña de esterilización comunitaria activa este mes en Villa Clara y La Habana.",
    "🚨 Casos urgentes: varios cachorros rescatados en Centro Habana necesitan hogar de tránsito urgente.",
    "💉 Si puedes donar jeringuillas, gasas o desparasitantes, contáctanos directamente por WhatsApp.",
    "❤️ Recuerda: adoptar a un mestizo es un acto de amor incondicional. ¡Adopta, no compres!"
  ]'::jsonb,
  '[
    {"question": "¿Cuáles son los requisitos para adoptar a un animal?", "answer": "Ser mayor de edad, contar con el consentimiento de todos los miembros del hogar, comprometerse a brindar alimento, atención médica y cariño, y firmar un acta de adopción ética con compromiso de esterilización."},
    {"question": "¿La adopción tiene algún costo en dinero?", "answer": "No. La adopción es 100% gratuita. Los rescatistas y protectores no cobran por los animales."},
    {"question": "¿Puedo adoptar si vivo en otro municipio o provincia?", "answer": "Sí, siempre que se pueda coordinar el traslado seguro del animalito."},
    {"question": "¿Qué es un Hogar de Tránsito?", "answer": "Una familia voluntaria que acoge temporalmente a un animal rescatado mientras se recupera o espera su hogar definitivo."}
  ]'::jsonb,
  '{"rescuedCount": "340+", "adoptionsCompleted": "280+", "provincesActive": "16", "volunteerHomes": "45"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.donation_settings (
  id, title, description,
  card_holder_cup, card_number_cup, bank_cup, payment_methods_cup,
  card_holder_mlc, card_number_mlc, bank_mlc,
  phone_confirmation, confirmation_note, needed_supplies, is_active
)
VALUES (
  'default',
  'Apoya a Nuestros Rescataditos',
  'No contamos con subsidios estatales ni grandes empresas. Cada cura veterinaria, vacuna, esterilización y plato de comida es posible gracias a la solidaridad de personas como tú.',
  'Protección Animal Solidaria Cuba',
  '9224 0000 1234 5678',
  'Banco Metropolitano / BANDEC',
  'Transfermóvil & EnZona',
  'Protección Animal Solidaria',
  '9225 0000 8765 4321',
  'BPA / BANDEC',
  '+53 5200 0000',
  'Por favor, envía captura del comprobante por WhatsApp o SMS para registrar tu aporte en el balance de transparencia.',
  '[
    {"name": "Alimento seco y húmedo (pienso para perros y gatos)", "urgent": true},
    {"name": "Desparasitantes internos y externos (pastillas y pipetas)", "urgent": true},
    {"name": "Antibióticos veterinarios (Amoxicilina, Cefalexina)", "urgent": true},
    {"name": "Material de cura: gasas, suero fisiológico, jeringuillas 3ml/5ml", "urgent": false},
    {"name": "Hogares de tránsito temporales para post-operatorios", "urgent": true}
  ]'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.pets (
  id, name, species, breed, gender, age_category, approx_age, size,
  province, municipality, address_reference, status,
  is_vaccinated, is_dewormed, is_sterilized, special_needs, story,
  contact_name, contact_whatsapp, contact_phone, image, is_featured, badge, sort_order
)
VALUES
(
  'pet-1', 'Canela', 'Perro', 'Mestiza criolla', 'Hembra', 'Joven', '1 año', 'Mediano',
  'La Habana', 'Plaza de la Revolución', 'Cerca del Parque Lennon, Vedado', 'urgente',
  true, true, true, 'Ninguna, totalmente sana',
  'Canela fue rescatada en una avenida concurrida. Es sumamente cariñosa, obediente, se lleva de maravilla con niños y otros perros. Busca una familia responsable que le dé el cariño que se merece.',
  'Laura (Protectora)', '5352000001', '+53 5200 0001',
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=80',
  true, 'Urgente', 1
),
(
  'pet-2', 'Milo', 'Gato', 'Carey atigrado', 'Macho', 'Cachorro', '4 meses', 'Pequeño',
  'Villa Clara', 'Santa Clara', 'Zona Buen Viaje', 'disponible',
  true, true, false, 'Compromiso de castración a los 6 meses',
  'Milo fue rescatado de un tejado bajo la lluvia. Es un ronroneador profesional, juguetón y acostumbrado al arenero.',
  'Carlos (Tránsito)', '5352000002', '+53 5200 0002',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80',
  true, 'Cachorro', 2
),
(
  'pet-3', 'Thor', 'Perro', 'Cruce con Pastor', 'Macho', 'Adulto', '3 años', 'Grande',
  'Matanzas', 'Cárdenas', 'Cárdenas centro', 'disponible',
  true, true, true, 'Necesita paseos diarios, guardián noble',
  'Thor es un perro noble, leal y muy protector de su hogar. Sus dueños emigraron y no pudieron llevarlo. Está sano, castrado y listo para una nueva casa.',
  'Elena', '5352000003', '+53 5200 0003',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=900&q=80',
  true, 'Castrado', 3
),
(
  'pet-4', 'Pelusa', 'Gato', 'Siamés mestizo', 'Hembra', 'Joven', '8 meses', 'Pequeño',
  'La Habana', 'Playa', 'Miramar', 'disponible',
  true, true, true, 'Ninguna',
  'Pelusa tiene unos hermosos ojos azules y un carácter muy tranquilo y dulce. Le encanta dormir al sol y compartir en familia.',
  'Beatriz', '5352000004', '+53 5200 0004',
  'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=80',
  false, 'Esterilizada', 4
),
(
  'pet-5', 'Rocky', 'Perro', 'Mestizo salchicha', 'Macho', 'Adulto', '2 años', 'Pequeño',
  'Santiago de Cuba', 'Santiago de Cuba', 'Reparto Sueño', 'disponible',
  true, true, true, 'Ninguna',
  'Rocky es bajito pero con una energía y simpatía enormes. Se adapta fácilmente a apartamentos y le fascina salir a pasear.',
  'Maykel', '5352000005', '+53 5200 0005',
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=900&q=80',
  false, 'Ideal Apto', 5
)
ON CONFLICT (id) DO NOTHING;
