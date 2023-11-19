const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalNear } } = require('mineflayer-pathfinder')
const autoeat = require('mineflayer-auto-eat')

const RANGE_GOAL = 2 // get within this radius of the player

const botArgs = {
    host: 'localhost',
    //port: '12345',
    username: "Vanity_bot",
    version: '1.20.1',
    auth: 'microsoft',
};


function initBot () {

  function attackPlayer (username) {
    const player = bot.players[username]
    if (!player || !player.entity) {
      bot.chat('I can\'t see you')
    } else {
      bot.chat(`Attacking ${player.username}`)
      bot.attack(player.entity)
    }
  }

  function attackEntity () {
    const entity = bot.nearestEntity()
    if (!entity) {
      bot.chat('No nearby entities')
    } else {
      bot.chat(`Attacking ${entity.name ?? entity.username}`)
      bot.attack(entity)
    }
  }


  function sayItems (items = null) {
    if (!items) {
      items = bot.inventory.items()
      if (bot.registry.isNewerOrEqualTo('1.9') && bot.inventory.slots[45]) items.push(bot.inventory.slots[45])
    }
    const output = items.map(itemToString).join(', ')
    if (output) {
      bot.chat(output)
    } else {
      bot.chat('I have no items.')
    }
  }

  async function tossItem (name, amount) {
    amount = parseInt(amount, 10)
    const item = itemByName(name)
    if (!item) {
      bot.chat(`I have no ${name}`)
    } else {
      try {
        if (amount) {
          await bot.toss(item.type, null, amount)
          bot.chat(`tossed ${amount} x ${name}`)
        } else {
          await bot.tossStack(item)
          bot.chat(`tossed ${name}`)
        }
      } catch (err) {
        bot.chat(`unable to toss: ${err.message}`)
      }
    }
  }

  async function equipItem (name, destination) {
    const item = itemByName(name)
    if (item) {
      try {
        await bot.equip(item, destination)
        bot.chat(`equipped ${name}`)
      } catch (err) {
        bot.chat(`cannot equip ${name}: ${err.message}`)
      }
    } else {
      bot.chat(`I have no ${name}`)
    }
  }

  async function unequipItem (destination) {
    try {
      await bot.unequip(destination)
      bot.chat('unequipped')
    } catch (err) {
      bot.chat(`cannot unequip: ${err.message}`)
    }
  }

  function useEquippedItem () {
    bot.chat('activating item')
    bot.activateItem()
  }

  async function craftItem (name, amount) {
    amount = parseInt(amount, 10)
    const item = bot.registry.itemsByName[name]
    const craftingTableID = bot.registry.blocksByName.crafting_table.id

    const craftingTable = bot.findBlock({
      matching: craftingTableID
    })

    if (item) {
      const recipe = bot.recipesFor(item.id, null, 1, craftingTable)[0]
      if (recipe) {
        bot.chat(`I can make ${name}`)
        try {
          await bot.craft(recipe, amount, craftingTable)
          bot.chat(`did the recipe for ${name} ${amount} times`)
        } catch (err) {
          bot.chat(`error making ${name}`)
        }
      } else {
        bot.chat(`I cannot make ${name}`)
      }
    } else {
      bot.chat(`unknown item: ${name}`)
    }
  }

  function itemToString (item) {
    if (item) {
      return `${item.name} x ${item.count}`
    } else {
      return '(nothing)'
    }
  }

  function itemByName (name) {
    const items = bot.inventory.items()
    if (bot.registry.isNewerOrEqualTo('1.9') && bot.inventory.slots[45]) items.push(bot.inventory.slots[45])
    return items.filter(item => item.name === name)[0]
  }


  // Setup bot connection
  let bot = mineflayer.createBot(botArgs);
  const defaultMove = new Movements(bot);


  bot.loadPlugin(pathfinder);
//  bot.loadPlugin(autoeat);


  bot.on('login', () => {
      let botSocket = bot._client.socket;
      console.log(`Logged in to ${botSocket.server ? botSocket.server : botSocket._host}`);
  });

  bot.on('end', () => {
      console.log(`Disconnected`);

      // Attempt to reconnect
      setTimeout(initBot, 5000);
  });

  bot.on('spawn', async () => {
      console.log("Spawned in");
      bot.chat("I'm back!");

      

//      bot.autoEat.options = {
//        priority: 'foodPoints',
//        startAt: 14,
//        bannedFood: []
//      }

      await bot.waitForTicks(12000);
      bot.chat("relogging...");
      bot.quit();
  });

  bot.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
          console.log(`Failed to connect to ${err.address}:${err.port}`)
      }
      else {
          console.log(`Unhandled error: ${err}`);
      }
  });

  // Load the plugin

//  bot.on('autoeat_started', () => {
//    console.log('Auto Eat started!')
//  })
//
//  bot.on('autoeat_stopped', () => {
//    console.log('Auto Eat stopped!')
//  })
//
//  bot.on('health', () => {
//    if (bot.food === 20) bot.autoEat.disable()
//    // Disable the plugin if the bot is at 20 food points
//    else bot.autoEat.enable() // Else enable the plugin again
//  })
//

  bot.on('chat', (username, message) => {
    if (username === bot.username) return

    if (message !== 'come') return
      const target = bot.players[username]?.entity
      if (!target) {
        bot.chat("I don't see you !")
        return
      }
      const { x: playerX, y: playerY, z: playerZ } = target.position
  
      bot.pathfinder.setMovements(defaultMove)
      bot.pathfinder.setGoal(new GoalNear(playerX, playerY, playerZ, RANGE_GOAL))

    if (message === 'attack me') attackPlayer(username)
    else if (message === 'attack') attackEntity()
  })

  


  bot.on('chat', async (username, message) => {
    if (username === bot.username) return
    const command = message.split(' ')
    switch (true) {
      case message === 'loaded':
        await bot.waitForChunksToLoad()
        bot.chat('Ready!')
        break
      case /^list$/.test(message):
        sayItems()
        break
      case /^toss \d+ \w+$/.test(message):
        // toss amount name
        // ex: toss 64 diamond
        tossItem(command[2], command[1])
        break
      case /^toss \w+$/.test(message):
        // toss name
        // ex: toss diamond
        tossItem(command[1])
        break
      case /^equip [\w-]+ \w+$/.test(message):
        // equip destination name
        // ex: equip hand diamond
        equipItem(command[2], command[1])
        break
      case /^unequip \w+$/.test(message):
        // unequip destination
        // ex: unequip hand
        unequipItem(command[1])
        break
      case /^use$/.test(message):
        useEquippedItem()
        break
      case /^craft \d+ \w+$/.test(message):
        // craft amount item
        // ex: craft 64 stick
        craftItem(command[2], command[1])
        break
    }
  })
  


    // Log errors and kick reasons:
    bot.on('kicked', console.log)
    bot.on('error', console.log)
};

initBot();


