import { getCurrentUser, getProfile, getUpcomingEvents } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Plus } from "lucide-react";
import { formatDateShort } from "@/lib/utils/format";
import Link from "next/link";
import { registerForEvent, cancelRegistration } from "@/lib/actions/events";

export default async function EventsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  if (!profile) redirect("/login");

  const events = await getUpcomingEvents(20);
  const isStaff = profile.role === "super_admin" || profile.role === "librarian";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground">Upcoming activities at American Corner Sousse</p>
        </div>
        {isStaff && (
          <Link href="/dashboard/events/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events?.map((event) => (
          <Card key={event.id}>
            {event.cover_image && (
              <img src={event.cover_image} alt={event.title} className="h-40 w-full object-cover rounded-t-lg" />
            )}
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{event.title}</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {event.type.replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {event.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDateShort(event.start_date)}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {event.location}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                {event.registered_count}/{event.max_capacity} registered
              </div>
              <form action={registerForEvent.bind(null, event.id)}>
                <Button
                  className="w-full"
                  size="sm"
                  disabled={event.registered_count >= event.max_capacity}
                >
                  {event.registered_count >= event.max_capacity ? "Full" : "Register"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>

      {!events?.length && (
        <p className="text-center py-12 text-muted-foreground">No upcoming events scheduled.</p>
      )}
    </div>
  );
}
