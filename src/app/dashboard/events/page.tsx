"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(p);
      const { data } = await supabase
        .from("events")
        .select("*")
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true })
        .limit(20);
      setEvents(data || []);
      setLoading(false);
    });
  }, [router]);

  async function register(eventId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: event } = await supabase.from("events").select("max_capacity, registered_count").eq("id", eventId).maybeSingle();
    if (!event || event.registered_count >= event.max_capacity) return;
    await supabase.from("event_registrations").insert({ event_id: eventId, user_id: user.id });
    await supabase.from("events").update({ registered_count: event.registered_count + 1 }).eq("id", eventId);
    const { data } = await supabase.from("events").select("*").gte("start_date", new Date().toISOString()).order("start_date", { ascending: true }).limit(20);
    setEvents(data || []);
  }

  const isStaff = profile?.role === "super_admin" || profile?.role === "librarian";

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground">Upcoming activities at American Corner Sousse</p>
        </div>
        {isStaff && (
          <Link href="/dashboard/events/new"><Button><Plus className="h-4 w-4 mr-2" />Create Event</Button></Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id}>
            {event.cover_image && <img src={event.cover_image} alt={event.title} className="h-40 w-full object-cover rounded-t-lg" />}
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{event.title}</CardTitle>
                <Badge variant="secondary" className="text-xs">{event.type.replace("_", " ")}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {event.description && <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>}
              <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" />{new Date(event.start_date).toLocaleDateString()}</div>
              <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" />{event.location}</div>
              <div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-muted-foreground" />{event.registered_count}/{event.max_capacity} registered</div>
              <Button className="w-full" size="sm" disabled={event.registered_count >= event.max_capacity} onClick={() => register(event.id)}>
                {event.registered_count >= event.max_capacity ? "Full" : "Register"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {!events.length && <p className="text-center py-12 text-muted-foreground">No upcoming events.</p>}
    </div>
  );
}
