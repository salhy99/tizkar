import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function seedTemplates() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get the wedding event type ID
  const { data: eventTypes } = await supabase.from('event_types').select('*').eq('slug', 'wedding');
  const weddingId = eventTypes?.[0]?.id;

  if (!weddingId) {
    console.error('Wedding event type not found');
    return;
  }

  // Define templates
  const templates = [
    {
      event_type_id: weddingId,
      name: 'ليالي',
      slug: 'layali',
      description: 'قالب كلاسيكي أنيق',
      base_price: 25000,
      status: 'ACTIVE',
      is_featured: true,
    },
    {
      event_type_id: weddingId,
      name: 'الزجاج الحديث',
      slug: 'modern-glass',
      description: 'تصميم عصري',
      base_price: 35000,
      status: 'ACTIVE',
      is_featured: false,
    },
    {
      event_type_id: weddingId,
      name: 'حديقة الورد',
      slug: 'rose-garden',
      description: 'لمسة زهرية رومانسية',
      base_price: 30000,
      status: 'ACTIVE',
      is_featured: false,
    }
  ];

  for (const t of templates) {
    // Delete old if exists by slug to avoid dups
    await supabase.from('templates').delete().eq('slug', t.slug);
    
    const { data: newTemplate, error } = await supabase.from('templates').insert(t).select().single();
    if (error) {
      console.error('Error inserting', t.name, error);
    } else {
      console.log('Inserted', t.name);
      
      // Insert a template version
      const { error: versionError } = await supabase.from('template_versions').insert({
        template_id: newTemplate.id,
        version_number: '1.0.0',
        configuration: {},
        theme: {},
        sections: [],
        status: 'ACTIVE'
      });
      if (versionError) {
        console.error('Error inserting version for', t.name, versionError);
      }
    }
  }
}

seedTemplates();
