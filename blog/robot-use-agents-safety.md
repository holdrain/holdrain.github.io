# From Motion Planning to Robot-Use Agents: Who Is Responsible for Safety?

## Introduction
Large language models (LLMs) have demonstrated increasingly strong capabilities in following natural-language instructions, interpreting visual information, and reasoning over long-horizon tasks. Building upon these capabilities, LLM-based agents have been increasingly adopted to perform complex tasks, including coding, web navigation, and computer use.

Recently, this agentic paradigm has begun to extend from digital environments to physical robotic systems, giving rise to **robot-use agents (RUAs)**. In these systems, LLMs or vision-language models (VLMs) interact with robotic platforms through predefined tools and APIs, enabling them to perceive their surroundings, make decisions, and execute physical actions. Unlike conventional robotic pipelines, which typically separate task planning, motion planning, and low-level control into explicitly defined components, RUAs introduce a model-driven decision-making layer that autonomously selects tools, determines intermediate actions, and adapts its behavior based on environmental feedback.

Vision-language-action models (VLAs) offer a useful comparison. A VLA maps observations and a task instruction to robot actions. In the RUA architecture considered here, a VLM-based agent repeatedly observes, reasons, and chooses tools or higher-level actions. A separate action layer then turns those choices into robot commands, potentially using code, a VLA, or a world model. The distinction lies in how the components are organized: a VLA provides an action policy, while an RUA coordinates the reasoning and execution around it. Both can operate in a closed loop.

![VLA and RUA hierarchy](/blog/robot-use-agents-safety/rua-vla-hierarchy.svg)

Robot-use agents (RUAs) are a promising direction for embodied AI. As vision-language models improve, an agentic architecture can bring stronger perception, reasoning, and long-horizon planning into robot control, while connecting these capabilities to specialized action tools. Early studies have shown better generalization and higher task success than selected VLA baselines in some settings. Much of this architecture remains to be built, however: agents need reliable tool interfaces, feedback, recovery, and safeguards to turn better reasoning into dependable physical behavior.

**In this article, we focus on safety.** Selecting the right subgoal and target pose is far from sufficient; the robot must also reach that target without colliding with obstacles, making unsafe contact, or violating other physical constraints.  As demonstrated by LIBERO-Safety, even advanced VLA models struggle with physical safety constraints and semantic safety reasoning. These findings also motivate further investigation into the safety of RUAs, where autonomous tool selection and high-level decision-making introduce additional challenges for reliable physical execution.

## Who Is Responsible for Safety Along the Way?

Suppose a robot is asked to pick up a cup. Who makes sure its arm reaches the cup without hitting anything along the way? 
The answer depends on how the robot turns that request into movement. A conventional planner, a learned action policy, and an agent calling robot tools can each take a different route from goal to motion. 
What matters is where, along that route, someone actually checks whether the movement is safe.

![Safety responsibility across conventional robotics, VLA-based robotics, and robot-use agents](/blog/robot-use-agents-safety/robot_safety_responsibility.svg)
In a conventional planning pipeline, the task planner specifies a goal, while motion planning and collision checking evaluate a proposed trajectory against models of the robot and its environment. The controller executes that trajectory, and monitoring can detect changes during execution. These are identifiable checkpoints, although their effectiveness still depends on the quality of the models, sensors, and constraints.

A planner such as cuRobo makes the **IK + motion planner / collision checking** layer concrete. It takes the current joint state, a target end-effector pose, and a world model containing obstacle geometry. It finds joint configurations for the target, searches and optimizes a path, and checks the robot's links and any attached object along that path against obstacles and joint constraints. If no valid path is found, it returns failure so the task planner or VLA can propose another approach or revise the subgoal.

This layer has three practical limits: an unreachable or inappropriate target from above cannot be repaired by collision checking alone; missing, mislocalized, or moving obstacles make the world model unreliable, especially when real-robot perception is built from camera and depth data; and controller error or a scene change during execution can invalidate a previously safe plan. The first calls for goal-level feedback, the second for updated perception, and the third for execution monitoring, replanning, or stopping.

In a VLA-based pipeline, safety can also be addressed through policy training and evaluation. [SafeVLA](https://arxiv.org/abs/2503.03480) trains the policy to complete tasks while limiting safety violations in simulation, while [SafeVLA-Bench](https://arxiv.org/abs/2606.00773) checks whether the task was completed safely; neither guarantees safety during execution.

An RUA adds another decision layer. Its agent may call a collision-aware planner, invoke a VLA skill, or issue incremental movements through a direct API. These routes can look similar to the agent while enforcing very different physical constraints. The agent chooses the goal and execution tool; the tool and controller must have explicit responsibilities for validating and carrying out the resulting motion.

The **safety responsibility gap** appears when a property is assumed to be checked somewhere in this chain, but no component actually checks it. For example, an agent might command a small movement toward a cup beside a fragile glass, assuming the controller will prevent collisions. If the controller only tracks the requested displacement, the arm may strike the glass even though both components behaved as designed. Clear tool contracts and independent checks make it possible to identify who validates the goal, the planned path, and the motion as it unfolds.




