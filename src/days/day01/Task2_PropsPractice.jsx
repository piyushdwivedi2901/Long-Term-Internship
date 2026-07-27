/**
 * Day 1 — Task 2: Props Practice
 * Goal: Convert the static card into a reusable <ProfileCard name="" bio="" />
 * component and render 3-4 different ones by passing different props.
 */

// Reusable component — takes props instead of hardcoded content
function ProfileCard({ name, bio, image }) {
  return (
    <div className="card">
      <img className="card-avatar" src={image} alt={name} />
      <h3 className="card-name">{name}</h3>
      <p className="card-bio">{bio}</p>
    </div>
  )
}

const people = [
  {
    name: 'Ada Lovelace',
    bio: 'Mathematician recognized for writing the first algorithm intended for a machine.',
    image: 'https://i.pravatar.cc/150?img=47',
  },
  {
    name: 'Grace Hopper',
    bio: 'Computer scientist and Navy rear admiral who pioneered machine-independent programming languages.',
    image: 'https://i.pravatar.cc/150?img=32',
  },
  {
    name: 'Alan Turing',
    bio: 'Mathematician and computer scientist, foundational to theoretical computer science and AI.',
    image: 'https://i.pravatar.cc/150?img=68',
  },
  {
    name: 'Margaret Hamilton',
    bio: 'Led the team that developed the on-board flight software for NASA\u2019s Apollo missions.',
    image: 'https://i.pravatar.cc/150?img=45',
  },
]

export default function Task2_PropsPractice() {
  return (
    <div className="task-section">
      <h2>Task 2: Props Practice</h2>
      <div className="card-grid">
        {people.map((person) => (
          <ProfileCard
            key={person.name}
            name={person.name}
            bio={person.bio}
            image={person.image}
          />
        ))}
      </div>
    </div>
  )
}
