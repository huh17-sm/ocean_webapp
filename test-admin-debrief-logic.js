require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
async function test() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: classes } = await supabase
        .from('classes')
        .select('id, date, time, type, location, is_completed, title')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .order('time', { ascending: false })
        .limit(50);
        
    const filteredClasses = classes?.filter((c) => {
        if (c.is_completed) return true
        const timeStr = c.time.length === 5 ? `${c.time}:00` : c.time
        const classDateTime = new Date(`${c.date}T${timeStr}+09:00`)
        return classDateTime < new Date()
    }) || []
    
    const classIds = filteredClasses.map((c) => c.id);
    
    const { data: attendees, error: err1 } = await supabase
        .from('reservations')
        .select('id, class_id, status')
        .in('class_id', classIds)
        .in('status', ['attended', 'confirmed']);
        
    const { data: debriefings, error: err2 } = await supabase
        .from('debriefings')
        .select('id, reservation:reservations!inner(class_id)')
        .in('reservation.class_id', classIds);
        
    filteredClasses.forEach(c => {
        const classAttendees = attendees?.filter((a) => a.class_id === c.id) || [];
        const classDebriefings = debriefings?.filter((d) => d.reservation.class_id === c.id) || [];
        const hasPendingDebriefing = classAttendees.length > 0 && classDebriefings.length < classAttendees.length;
        console.log(`Class ${c.date} ${c.title || c.type}: Attendees=${classAttendees.length}, Debriefings=${classDebriefings.length}, Pending=${hasPendingDebriefing}`);
    });
}
test()
