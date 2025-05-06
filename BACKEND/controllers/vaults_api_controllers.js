const { v4: uuid } = require('uuid');
const Vault = require('../models/vaults');


exports.createVault = async (req, res) => {
    const { email } = req.body;

    const vault = new Vault({
        email,
        encrypted_vault: []
    });

    try {
        const sample = await Vault.findOne({ email });
        if (sample) {
            return res.sendStatus(400);
        }
        const saved = await vault.save();
        res.sendStatus(201);
    } catch (err) {
        res.sendStatus(500);
    }
}

exports.cloneEntry = async (req, res) => {
    const { sub: email } = req.user;

    try {
        let vault = await Vault.findOne({ email });
        let entryToClone = vault.encrypted_vault[req.params.entry];
        entryToClone.entry_id = uuid();

        const updatedVault = await Vault.findOneAndUpdate(
            { email },
            { $push: { encrypted_vault: entryToClone } },
            { new: true }
        );

        res.sendStatus(200);

    } catch (err) {
        console.log(err);
    }
}

exports.addEntry = async (req, res) => {
    const { sub: email } = req.user;
    const { encrypted_data, item_name, url } = req.body;
    const newEntry = {
        entry_id: uuid(),
        item_name,
        url,
        encrypted_data
    };

    try {
        const updatedVault = await Vault.findOneAndUpdate(
            { email },
            { $push: { encrypted_vault: newEntry } },
            { new: true }
        );

        if (!updatedVault) {
            return res.status(404).send('Vault not found');
        }

        res.sendStatus(201);
    } catch(err) {
        res.sendStatus(400);
    }
}

exports.getLoginInfo = async (req, res) => {
    const { sub: email } = req.user;

    try {
        const vault = await Vault.findOne({ email });

        if (req.params.toGet === 'all') {
            if (!vault) {
                return res.sendStatus(404);
            }

            res.status(200).json({ entries: vault.encrypted_vault });
        } else {
            res.status(200).send(vault.encrypted_vault[req.params.toGet]);
        }
    } catch(err) {
        res.sendStatus(500);
    }
}