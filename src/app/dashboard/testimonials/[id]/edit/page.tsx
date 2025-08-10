import EditTestimonialForm from "./EditTestimonialForm"

export default async function EditTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EditTestimonialForm id={id} />
}
