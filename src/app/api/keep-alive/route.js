import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('questions') // Replace with your table name, e.g., 'questions'
      .select('id')
      .limit(1); // Minimize load
    if (error) throw error;
    return NextResponse.json({ message: 'Ping successful', data });
  } catch (err) {
    console.error('Error pinging Supabase:', err);
    return NextResponse.json({ message: 'Error pinging Supabase' }, { status: 500 });
  }
}