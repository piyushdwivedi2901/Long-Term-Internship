/**
 * Day 1 — Task 1: Static Profile Card
 * Goal: Render a card with a name, image, and bio using hardcoded JSX.
 * (No props yet — everything is written directly inside the component.)
 */
export default function Task1_StaticProfileCard() {
  return (
    <div className="task-section">
      <h2>Task 1: Static Profile Card</h2>
      <div className="card">
        <img
          className="card-avatar"
          src="https://i.pravatar.cc/150?img=12"
          alt="Piyush Dwivedi"
        />
        <h3 className="card-name">Piyush Dwivedi</h3>
        <p className="card-bio">
          Frontend developer in training, currently learning React through a
          structured 5-week internship roadmap — components, hooks, routing,
          and mini projects.
        </p>
      </div>
    </div>
  )
}
