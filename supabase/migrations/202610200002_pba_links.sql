update public.subjects set name = 'PBA Chemistry' where slug = 'chemistry';
update public.subjects set name = 'PBA Physics' where slug = 'physics';
update public.subjects set name = 'PBA Computer Science' where slug = 'computer-science';

insert into public.resources (
  subject_id, title, class_grade, topic, resource_type, external_url
)
select subject.id, 'Complingo PBA notes', 'All classes', 'PBA notes', 'pba',
       'https://muhammad4bdullah.github.io/complingo/#'
from public.subjects as subject
where subject.slug = 'computer-science'
  and not exists (
    select 1 from public.resources as resource
    where resource.subject_id = subject.id
      and resource.external_url = 'https://muhammad4bdullah.github.io/complingo/#'
  );

insert into public.resources (
  subject_id, title, class_grade, topic, resource_type, external_url
)
select subject.id, 'Computer Science PBA notes', 'All classes', 'PBA notes', 'pba',
       'https://muhammad4bdullah.github.io/CS-PBA/'
from public.subjects as subject
where subject.slug = 'computer-science'
  and not exists (
    select 1 from public.resources as resource
    where resource.subject_id = subject.id
      and resource.external_url = 'https://muhammad4bdullah.github.io/CS-PBA/'
  );