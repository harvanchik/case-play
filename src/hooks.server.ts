import { start_mongo } from '$db/mongo';

start_mongo()
	.then(() => {
		console.info('MongoDB connected!');
	})
	.catch(error => {
		console.error(error);
	});
