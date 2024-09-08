interface PokemonData {
  name: string;
  sprites: {
    front_default: string;
  };
  height: number;
  weight: number;
  base_experience: number;
  types: Array<{ type: { name: string } }>;
  abilities: Array<{ ability: { name: string }, is_hidden: boolean }>;
  stats: Array<{ stat: { name: string }, base_stat: number }>;
}

const PokemonDisplay = ({ pokemonData }: {pokemonData: PokemonData}) => {
  if (!pokemonData) return <div>No Pokémon data available</div>;

  return (
    <div className="pokemon-display">
      <h1>{pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1)}</h1>
      
      <img 
        src={pokemonData.sprites.front_default} 
        alt={`${pokemonData.name} front view`} 
      />
      
      <div className="pokemon-info">
        <p>Height: {pokemonData.height / 10} m</p>
        <p>Weight: {pokemonData.weight / 10} kg</p>
        <p>Base Experience: {pokemonData.base_experience}</p>
      </div>

      <div className="pokemon-types">
        <h3>Types:</h3>
        <ul>
          {pokemonData.types.map((type, index) => (
            <li key={index}>{type.type.name}</li>
          ))}
        </ul>
      </div>

      <div className="pokemon-abilities">
        <h3>Abilities:</h3>
        <ul>
          {pokemonData.abilities.map((ability, index) => (
            <li key={index}>
              {ability.ability.name} 
              {ability.is_hidden && " (Hidden Ability)"}
            </li>
          ))}
        </ul>
      </div>

      <div className="pokemon-stats">
        <h3>Base Stats:</h3>
        <ul>
          {pokemonData.stats.map((stat, index) => (
            <li key={index}>
              {stat.stat.name}: {stat.base_stat}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PokemonDisplay;