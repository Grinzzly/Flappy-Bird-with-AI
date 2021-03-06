const options = {
  /**
   * Logistic activation function.
   *
   * @param a - Input value.
   * @return Number - function output.
   */
  activation: function (a) {
    return (1 / (1 + Math.exp(-a)))
  },

  /**
   * Returns a random value between -1 and 1.
   *
   * @return Number - random function output.
   */
  randomClamped: function () {
    return Math.random() * 2 - 1;
  },

  // Conscious factors and parameters (along with default values).
  network: [1, [1], 1], // Perception network structure (1 hidden layer).
  population: 50, // Population by generation.
  elitism: 0.2, // Best networks kept unchanged for the next
  // generation (rate).
  randomBehaviour: 0.2, // New random networks for the next generation
  // (rate).
  mutationRate: 0.1, // Mutation rate on the weights of synapses.
  mutationRange: 0.5, // Interval of the mutation changes on the
  // synapse weight.
  historic: 0, // Latest generations saved.
  lowHistoric: false, // Only save score (not the network).
  scoreSort: -1, // Sort order (-1 = desc, 1 = asc).
  nbChild: 1 // Number of children by breeding.
};

class BirdBrain {
  /**
   * Provides a set of classes and methods for handling BirdBrain and
   * genetic algorithms.
   *
   * @param options An object of options for BirdBrain.
   */
  constructor(options) {
    this.generations = new Generations();
    this.set(options);
  }

  /**
   * Override default options.
   *
   * @param initOptions - An object of BirdBrain options.
   * @return void
   */
  set(initOptions) {
    for (let i in initOptions) {
      if (initOptions.hasOwnProperty(i)) {
        options[i] = initOptions[i];
      }
    }

    this.options = options;
  };

  /**
   * Create the next generation.
   *
   * @return Array Neural Network array for next Generation.
   */
  nextGeneration() {
    let networks = [];

    if (this.generations.generations.length === 0) {
      // If no Generations, create first.
      networks = this.generations.firstGeneration();
    } else {
      // Otherwise, create next one.
      networks = this.generations.nextGeneration();
    }

    // Create Networks from the current Generation.
    const nns = [];

    for (let i in networks) {
      const nn = new Network();

      nn.setSave(networks[i]);
      nns.push(nn);
    }

    if (options.lowHistoric) {
      // Remove old Networks.
      if (this.generations.generations.length >= 2) {
        const genomes =
          this.generations
            .generations[self.generations.generations.length - 2]
            .genomes;
        for (let i in genomes) {
          delete genomes[i].network;
        }
      }
    }

    if (options.historic !== -1) {
      // Remove older generations.
      if (this.generations.generations.length > options.historic + 1) {
        this.generations.generations.splice(0,
          this.generations.generations.length - (options.historic + 1));
      }
    }

    return nns;
  };

  /**
   * Adds a new Genome with specified Neural Network and score.
   *
   * @param network Neural Network.
   * @param score Score value.
   * @return void.
   */
  networkScore(network, score) {
    this.generations.addGenome(new Genome(score, network.getSave()));
  }
}



class Neuron {
  constructor() {
    this.value = 0;
    this.weights = [];
  }

  /**
   * Initialize number of neuron weights to random clamped values.
   *
   * @param nb Number of neuron weights (number of inputs).
   * @return void
   */
  populate(nb) {
    this.weights = [];
    for (let i = 0; i < nb; i++) {
      this.weights.push(options.randomClamped());
    }
  }
}


class Layer {
  /**
   * Neural Network Layer class.
   *
   * @constructor
   * @param index Index of this Layer in the Network.
   */
  constructor (index) {
    this.id = index || 0;
    this.neurons = [];
  }

  /**
   * Populate the Layer with a set of randomly weighted Neurons.
   *
   * Each Neuron be initialed with nbInputs inputs with a random clamped
   * value.
   *
   * @param nbNeurons Number of neurons.
   * @param nbInputs Number of inputs.
   * @return void
   */
  populate(nbNeurons, nbInputs) {
    this.neurons = [];
    for (let i = 0; i < nbNeurons; i++) {
      const n = new Neuron();

      n.populate(nbInputs);
      this.neurons.push(n);
    }
  }
}

/*NEURAL NETWORK**************************************************************/
/**
 * Neural Network class
 *
 * Composed of Neuron Layers.
 *
 * @constructor
 */
class Network {
  constructor() {
    this.layers = [];
  }

  /**
   * Generate the Network layers.
   *
   * @param input Number of Neurons in Input layer.
   * @param hidden Number of Neurons per Hidden layer.
   * @param output Number of Neurons in Output layer.
   * @return void
   */
  perceptronGeneration(input, hidden, output) {
    let index = 0;
    let previousNeurons = 0;
    let layer = new Layer(index);

    layer.populate(input, previousNeurons); // Number of Inputs will be set to
    // 0 since it is an input layer.
    previousNeurons = input; // number of input is size of previous layer.
    this.layers.push(layer);
    index++;

    for (const i in hidden) {
      // Repeat same process as first layer for each hidden layer.
      const layer = new Layer(index);
      layer.populate(hidden[i], previousNeurons);
      previousNeurons = hidden[i];
      this.layers.push(layer);
      index++;
    }

    layer = new Layer(index);
    layer.populate(output, previousNeurons); // Number of input is equal to
    // the size of the last hidden
    // layer.
    this.layers.push(layer);
  }

  /**
   * Create a copy of the Network (neurons and weights).
   *
   * Returns number of neurons per layer and a flat array of all weights.
   *
   * @return {'weights': Array, 'neurons: []} Network data.
   */
  getSave() {
    const dataSet = {
      neurons: [], // Number of Neurons per layer.
      weights: [] // Weights of each Neuron's inputs.
    };

    for (const i in this.layers) {
      dataSet.neurons.push(this.layers[i].neurons.length);
      for (const j in this.layers[i].neurons) {
        for (const k in this.layers[i].neurons[j].weights) {
          // push all input weights of each Neuron of each Layer into a flat
          // array.
          dataSet.weights.push(this.layers[i].neurons[j].weights[k]);
        }
      }
    }

    return dataSet;
  }

  /**
   * Apply network data (neurons and weights).
   *
   * @param save - Copy of network data (neurons and weights).
   * @return void
   */
  setSave(save) {
    let previousNeurons = 0;
    let index = 0;
    let indexWeights = 0;
    this.layers = [];

    for (let i in save.neurons) {
      // Create and populate layers.
      const layer = new Layer(index);
      layer.populate(save.neurons[i], previousNeurons);
      for (const j in layer.neurons) {
        for (const k in layer.neurons[j].weights) {
          // Apply neurons weights to each Neuron.
          layer.neurons[j].weights[k] = save.weights[indexWeights];

          indexWeights++; // Increment index of flat array.
        }
      }
      previousNeurons = save.neurons[i];
      index++;
      this.layers.push(layer);
    }
  }

  /**
   * Compute the output of an input.
   *
   * @param inputs - Set of inputs.
   * @return [] - Network output.
   */
  compute(inputs) {
    // Set the value of each Neuron in the input layer.
    for (const i in inputs) {
      if (this.layers[0] && this.layers[0].neurons[i]) {
        this.layers[0].neurons[i].value = inputs[i];
      }
    }

    let prevLayer = this.layers[0]; // Previous layer is input layer.
    for (let i = 1; i < this.layers.length; i++) {
      for (let j in this.layers[i].neurons) {
        // For each Neuron in each layer.
        let sum = 0;

        for (const k in prevLayer.neurons) {
          // Every Neuron in the previous layer is an input to each Neuron in
          // the next layer.
          sum += prevLayer.neurons[k].value *
            this.layers[i].neurons[j].weights[k];
        }

        // Compute the activation of the Neuron.
        this.layers[i].neurons[j].value = options.activation(sum);
      }

      prevLayer = this.layers[i];
    }

    // All outputs of the Network.
    const out = [];
    const lastLayer = this.layers[this.layers.length - 1];
    for (const i in lastLayer.neurons) {
      out.push(lastLayer.neurons[i].value);
    }

    return out;
  }
}

/*GENOME**********************************************************************/
/**
 * Genome class.
 *
 * Composed of a score and a Neural Network.
 *
 * @constructor
 *
 * @param {score}
 * @param {network}
 */
class Genome {
  constructor(score, network) {
    this.score = score || 0;
    this.network = network || null;
  }
}

/*GENERATION******************************************************************/
/**
 * Generation class.
 *
 * Composed of a set of Genomes.
 *
 * @constructor
 */
class Generation {
  constructor(options) {
    this.options = options;
    this.genomes = [];
  }

  /**
   * Add a genome to the generation.
   *
   * @param genome Genome to add.
   * @return void.
   */
  addGenome(genome) {
    // Locate position to insert Genome into.
    // The gnomes should remain sorted.
    let i;
    for (i = 0; i < this.genomes.length; i++) {
      // Sort in descending order.
      if (options.scoreSort < 0) {
        if (genome.score > this.genomes[i].score) {
          break;
        }
        // Sort in ascending order.
      } else {
        if (genome.score < this.genomes[i].score) {
          break;
        }
      }
    }

    // Insert genome into correct position.
    this.genomes.splice(i, 0, genome);
  }

  /**
   * Breed to genomes to produce offspring(s).
   *
   * @param g1 Genome 1.
   * @param g2 Genome 2.
   * @param nbchildren Number of offspring (children).
   */
  breed(g1, g2, nbchildren) {
    const dataSet = [];

    for (let nb = 0; nb < nbchildren; nb++) {
      // Deep clone of genome 1.
      const data = JSON.parse(JSON.stringify(g1));
      for (const i in g2.network.weights) {
        // Genetic crossover
        // 0.5 is the crossover factor.
        // FIXME Really should be a predefined constant.
        if (Math.random() <= 0.5) {
          data.network.weights[i] = g2.network.weights[i];
        }
      }

      // Perform mutation on some weights.
      for (const i in data.network.weights) {
        if (Math.random() <= options.mutationRate) {
          data.network.weights[i] += Math.random() *
            options.mutationRange *
            2 -
            options.mutationRange;
        }
      }
      dataSet.push(data);
    }

    return dataSet;
  }

  /**
   * Generate the next generation.
   *
   * @return Array - Next generation data array.
   */
  generateNextGeneration() {
    const nexts = [];

    for (let i = 0; i < Math.round(options.elitism * options.population); i++) {
      if (nexts.length < options.population) {
        // Push a deep copy of ith Genome's Network.
        nexts.push(JSON.parse(JSON.stringify(this.genomes[i].network)));
      }
    }

    for (let i = 0; i < Math.round(options.randomBehaviour *
      options.population); i++) {
      const n = JSON.parse(JSON.stringify(this.genomes[0].network));
      for (const k in n.weights) {
        n.weights[k] = options.randomClamped();
      }
      if (nexts.length < options.population) {
        nexts.push(n);
      }
    }

    let max = 0;

    while (true) {
      for (let i = 0; i < max; i++) {
        // Create the children and push them to the nexts array.
        const children = this.breed(this.genomes[i], this.genomes[max],
          (options.nbChild > 0 ? options.nbChild : 1));
        for (const c in children) {
          nexts.push(children[c].network);
          if (nexts.length >= options.population) {
            // Return once number of children is equal to the
            // population by generation value
            return nexts;
          }
        }
      }
      max++;
      if (max >= this.genomes.length - 1) {
        max = 0;
      }
    }
  };
}

class Generations {
  /**
   * Generations class.
   *
   * Hold's previous Generations and current Generation.
   *
   * @constructor
   */
  constructor() {
    this.generations = [];
    // const currentGeneration = new Generation();
  }

  /**
   * Create the first generation.
   *
   * @return [] First Generation.
   */
  firstGeneration() {
    const out = [];

    for (let i = 0; i < options.population; i++) {
      // Generate the Network and save it.
      const nn = new Network();

      nn.perceptronGeneration(options.network[0],
        options.network[1],
        options.network[2],
      );
      out.push(nn.getSave());
    }

    this.generations.push(new Generation());

    return out;
  };

  /**
   * Create the next Generation.
   *
   * @return Boolean || Array - Next Generation.
   */
  nextGeneration() {
    if (this.generations.length === 0) {
      // Need to create first generation.
      return false;
    }

    const gen = this.generations[this.generations.length - 1]
      .generateNextGeneration();
    this.generations.push(new Generation());

    return gen;
  }

  /**
   * Add a genome to the Generations.
   *
   * @param genome
   * @return Boolean - False if no Generations to add to.
   */
  addGenome(genome) {
    // Can't add to a Generation if there are no Generations.
    if (this.generations.length === 0) return false;

    return this.generations[this.generations.length - 1].addGenome(genome);
  };
}
