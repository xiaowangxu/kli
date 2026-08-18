import Yoga from "yoga-layout";

const DefaultLayoutConfig = Yoga.Config.create();
// The renderer targets a terminal cell grid. Let Yoga round absolute edges to
// that grid so flex remainders are distributed without changing configured gaps.
DefaultLayoutConfig.setPointScaleFactor(1);

export default DefaultLayoutConfig;
