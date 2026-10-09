# From Motion Planning to Robot-Use Agents: Who Is Responsible for Safety?

## Introduction

Robotic systems are becoming increasingly capable of understanding natural-language instructions, interpreting visual environments, and autonomously interacting with the physical world. An emerging direction is the development of **Robot-Use Agents (RUAs)**, where vision-language models (VLMs) or large language models (LLMs) operate robotic platforms through predefined tools and APIs.

Unlike conventional robotic pipelines, where task planning, motion planning, and control often have explicitly defined responsibilities, RUAs introduce an autonomous decision-making agent that can select tools, generate intermediate actions, and adapt its behavior based on environmental feedback.

This raises an important question: **Who is responsible for ensuring that a robot moves safely when its actions are selected by an autonomous agent?**

To understand the implications, we first need to examine how existing robotic systems handle motion planning and collision avoidance.

## How Do Conventional Robotic Systems Move Safely?

Consider a robotic arm tasked with picking up a cup from a table. The objective seems straightforward: move the gripper to the cup, grasp it, and transport it to a destination.

However, knowing the destination is not enough.

The robot must determine how to reach the target while respecting its physical constraints and avoiding unintended collisions with surrounding objects. A typical robotic manipulation pipeline addresses this through several stages.

**1. Perception and Environment Representation**

The system first determines the robot's current state and represents relevant objects in its workspace. Camera observations, depth measurements, joint encoders, and other sensors may contribute to this representation.

For collision checking, the environment is commonly represented through geometric models such as bounding volumes, meshes, or occupancy maps. The robot also has its own geometric and kinematic model, describing its links, joints, and physical dimensions.

These representations allow the system to reason not only about where the gripper is located, but also about the space occupied by the entire robot.

**2. Inverse Kinematics and Goal Configuration**

Given a desired end-effector pose, the system may use inverse kinematics (IK) to determine joint angles that can achieve it.

Importantly, multiple joint configurations may correspond to the same end-effector pose. A robotic arm might reach a target with its elbow extended toward an obstacle or with its elbow bent away from it.

Consequently, reaching the desired coordinates does not necessarily imply that a particular joint configuration is safe.

**3. Motion Planning and Collision Checking**

A motion planner searches for a feasible path from the robot's current configuration to a target configuration.

Instead of considering only the gripper's movement, collision-aware planning evaluates the robot's geometry along the proposed path. It may check for collisions between the robot and its environment, as well as self-collisions between different robot links.

Planning algorithms such as RRT and PRM, or optimization-based methods such as CHOMP, can be used to generate paths while accounting for relevant constraints.

For example, a planner may select a longer trajectory around a water glass rather than a shorter trajectory that would cause the robot's forearm to strike it.

Some contacts are intentional, such as grasping an object or pushing a drawer. Therefore, the goal is not to eliminate all contact, but to distinguish permitted interactions from unsafe collisions.

**4. Trajectory Generation and Low-Level Control**

After obtaining a feasible geometric path, the system generates an executable trajectory, considering factors such as joint velocity and acceleration limits.

A low-level controller then tracks the planned trajectory by generating appropriate joint commands or motor torques.

This distinction is important: the motion planner determines *where and how the robot should move*, while the controller is primarily responsible for executing the commanded motion accurately.

**5. Execution Monitoring and Replanning**

Planning a safe trajectory does not guarantee that execution will remain safe.

Objects may move, perception may be inaccurate, and the robot may deviate from its expected trajectory. Depending on the system, execution monitoring and collision-aware safeguards can detect unsafe conditions, trigger replanning, or stop the robot.

Thus, safety in a well-engineered robotic system is not necessarily a single planning decision. It can involve continuous coordination between perception, planning, control, and monitoring.

These mechanisms provide explicit places where physical constraints can be checked. Nevertheless, their effectiveness depends on environmental accuracy, sensor coverage, implementation, and the safety constraints being enforced.

## What Changes with Robot-Use Agents?

Robot-Use Agents introduce a different interaction model.

Instead of following a fixed task-specific program or relying entirely on a predefined manipulation pipeline, an autonomous agent can interpret instructions, inspect visual observations, decompose tasks, and invoke robotic tools.

For example, an RUA might perform the following sequence:

1. Observe a cup on the table.
2. Call `move_forward(0.05)`.
3. Observe the updated environment.
4. Call `move_left(0.02)`.
5. Call `close_gripper()`.
6. Continue toward the destination.

Each operation may be translated by an underlying controller into joint movements.

However, this introduces an architectural ambiguity: **Does the robot actually have a motion planner, or is the agent effectively determining the trajectory through a sequence of local tool calls?**

The answer depends on how the tools are implemented.

For example, a `move_to_pose()` tool might invoke a collision-aware motion planner that generates a valid trajectory. In contrast, a `move_forward()` tool might simply command a Cartesian displacement, leaving collision avoidance largely to the agent's decisions or to additional safeguards, if present.

These tools may look similar from the agent's perspective, but they can provide fundamentally different safety properties.

Moreover, small actions do not automatically guarantee safe movements. Even a few centimeters of end-effector displacement can cause another part of the robotic arm to collide with an obstacle.

An agent can therefore successfully generate and execute a sequence of valid tool calls without ensuring that the resulting physical trajectory is safe.

## The Shift in Safety Responsibilities

The emergence of RUAs does not necessarily eliminate conventional motion planning. Instead, it changes how safety-related decisions are distributed across the system.

In some architectures, a high-level agent specifies task goals while dedicated planning modules preserve responsibility for geometric feasibility and collision checking.

In others, the agent directly selects incremental movements, implicitly assuming some responsibility for choosing safe paths.

A third possibility is that the system employs independent safety filters that validate or modify agent-generated actions before execution.

The concern arises when these responsibilities are not clearly defined.

Imagine an RUA approaching a cup placed beside a fragile glass. The agent selects a small movement toward the cup, assuming the robot controller will prevent any collisions. However, the controller may only be designed to track the requested displacement, assuming that the upstream decision-maker has already selected a safe action.

Neither component necessarily violates its own design assumptions, yet the combined system may produce unsafe behavior.

This illustrates a potential **safety responsibility gap**: a situation where no component explicitly verifies a safety property because different layers implicitly assume that another component is responsible for it.

The problem is not simply whether the model makes mistakes, but whether the overall architecture can detect and contain those mistakes before they affect physical execution.

## New Security Challenges in Agentic Robotic Systems

RUAs introduce additional security concerns because their actions can be influenced by external information, including visual observations, natural-language instructions, and tool outputs.

For example, an attacker might place malicious instructions in the robot's visual environment, attempting to manipulate the agent into selecting an unsafe destination or generating an inappropriate sequence of movement commands.

The resulting physical hazards, such as collisions or unintended object manipulation, are not new to robotics. What is different is the pathway through which they may arise: adversarial information can influence a general-purpose reasoning agent, which then invokes legitimate robot tools to execute the resulting decisions.

This creates several research questions.

**Can an attacker exploit the gap between agent-level decision-making and physical safety enforcement?** An agent may generate commands that are valid according to the tool interface but unsafe in the physical environment.

**Can safety checks remain effective across multi-step execution?** An individually acceptable tool call may become dangerous when combined with preceding actions or changing environmental conditions.

**How should safety be enforced across different levels of abstraction?** High-level reasoning can help identify inappropriate goals, whereas geometric planning and low-level safeguards can enforce specific physical constraints. Neither mechanism necessarily substitutes for the other.

**How should we evaluate robot-use agent safety?** Final task success alone may conceal unsafe intermediate trajectories, near-collisions, unnecessary risk-taking, or failures that are avoided only by chance.

These questions suggest that RUA security should be evaluated at the level of the complete agent–tool–controller system rather than treating the VLM as an isolated component.

## Conclusion: Safety Beyond Task Completion

Conventional robotics has developed extensive mechanisms for motion planning, collision checking, trajectory generation, and execution monitoring. These mechanisms make it possible to explicitly evaluate many physical constraints before and during movement, although they do not provide unconditional safety guarantees.

Robot-Use Agents introduce a new decision-making layer that can interact with these mechanisms through tools and APIs. Depending on the architecture, the agent may delegate motion planning to specialized modules, partially replace planning decisions with incremental commands, or operate through interfaces with limited safety enforcement.

The key challenge is therefore not that RUAs necessarily lack motion planning, but that **the boundary between autonomous decision-making and physical safety enforcement can become unclear**.

As robotic agents gain greater autonomy, understanding these boundaries will become increasingly important. Future research should investigate not only whether agents can successfully complete tasks, but also whether their decisions can be independently validated, safely executed, and monitored throughout multi-step interactions.

Ultimately, a reliable Robot-Use Agent should not merely know what action to take next. The complete system must also ensure, within clearly defined safety assumptions, that executing that action does not compromise physical safety.