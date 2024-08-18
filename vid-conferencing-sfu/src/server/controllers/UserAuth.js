//models check info using zod
const zod = require("zod")
const signupBody = zod.object({
    username: zod.string().email(),
	firstName: zod.string().max(50).trim(),
	lastName: zod.string().max(50).trim(),
	password: zod.string().min(6)
})

const signinBody = zod.object({
    username: zod.string().email(),
	password: zod.string()
})

const updateBody = zod.object({
	password: zod.string().optional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional(),
})